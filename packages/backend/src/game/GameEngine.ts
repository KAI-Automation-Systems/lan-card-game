import type { GameState, Player, FinalScore, RoundScore } from '@skyjo/shared'
import {
  MAX_SCORE,
  MIN_PLAYERS,
  INITIAL_FLIP_COUNT,
  createDeck,
  shuffleDeck,
  dealCards,
  checkColumnElimination,
  eliminateColumns,
  calculateRoundScore,
  applyPenalty,
  revealAllCards,
  hasPlayerFinished,
  recycleDeck,
} from '@skyjo/shared'

/**
 * Server-side game state machine. Elke publieke methode valideert de actie,
 * muteert de state en geeft die terug (of gooit een Error met beschrijvende message).
 * ALLE game state mutaties horen hier te gebeuren — nooit op de frontend.
 *
 * De comments verwijzen waar relevant naar de kritieke regels uit SPEC.md sectie 11.
 */
export class GameEngine {
  /**
   * Start de eerste ronde. Deelt kaarten uit en gaat naar de initial-flip fase.
   * SPEC 11.9: initial flip is simultaan — geen beurtvolgorde.
   */
  startGame(state: GameState): GameState {
    if (state.phase !== 'lobby') throw new Error('Spel is al gestart')
    if (state.players.length < MIN_PLAYERS) throw new Error('Minimaal 2 spelers nodig')
    state.roundNumber = 1
    this.dealNewRound(state)
    state.startingPlayerIndex = 0
    state.currentPlayerIndex = 0
    return state
  }

  /**
   * Draait tijdens initial-flip één startkaart om. Wanneer alle spelers 2 kaarten
   * hebben omgedraaid, wordt de beginspeler bepaald en gaat het spel naar 'playing'.
   * SPEC 2.3: hoogste som van 2 kaarten begint; gelijkspel → jongste (laagste index).
   */
  flipInitialCard(state: GameState, playerId: string, row: number, col: number): GameState {
    if (state.phase !== 'initial-flip') throw new Error('Niet in de initial-flip fase')
    const player = this.getPlayer(state, playerId)
    if (player.initialFlipsRemaining <= 0) throw new Error('Geen flips meer over')
    const card = this.getCard(player, row, col)
    if (card.faceUp) throw new Error('Kaart is al omgedraaid')

    card.faceUp = true
    player.initialFlipsRemaining--

    const everyoneDone = state.players.every((p) => p.initialFlipsRemaining === 0)
    if (everyoneDone) {
      if (state.roundNumber === 1) {
        state.startingPlayerIndex = this.determineHighestSumPlayer(state)
      }
      // SPEC 11.8: vanaf ronde 2 begint de vorige ronde-afsluiter (startingPlayerIndex).
      state.currentPlayerIndex = state.startingPlayerIndex
      state.phase = 'playing'
      state.turnStep = 'choose-source'
    }
    return state
  }

  /**
   * Pak de bovenste kaart van de aflegstapel. SPEC 11.1: dit is VERPLICHT ruilen —
   * de speler kan deze kaart niet meer weggooien.
   */
  drawFromDiscard(state: GameState, playerId: string): GameState {
    this.validatePlaying(state, playerId)
    if (state.drawnCard) throw new Error('Er is al een kaart getrokken')
    if (state.discardPile.length === 0) throw new Error('Aflegstapel is leeg')

    const card = state.discardPile.pop()!
    state.drawnCard = { ...card, faceUp: true }
    state.drawnFromDiscard = true
    state.turnStep = 'drawn-card'
    return state
  }

  /**
   * Trek een kaart van de trekstapel (privé zichtbaar). SPEC 11.7: als de trekstapel
   * leeg is, wordt de aflegstapel (behalve bovenste kaart) opnieuw geschud.
   */
  drawFromDeck(state: GameState, playerId: string): GameState {
    this.validatePlaying(state, playerId)
    if (state.drawnCard) throw new Error('Er is al een kaart getrokken')

    const recycled = recycleDeck(state.deck, state.discardPile)
    state.deck = recycled.newDeck
    state.discardPile = recycled.newDiscardPile
    if (state.deck.length === 0) throw new Error('Geen kaarten meer beschikbaar')

    const card = state.deck.pop()!
    state.drawnCard = { ...card, faceUp: true }
    state.drawnFromDiscard = false
    state.turnStep = 'drawn-card'
    return state
  }

  /**
   * Ruil de getrokken kaart met een grid-positie; de oude kaart gaat face-up op de
   * aflegstapel. SPEC 11.2: een face-down kaart ruilen is blind (mag niet bekeken).
   * SPEC 11.3: kolom-eliminatie daarna is verplicht.
   */
  placeDrawnCard(state: GameState, playerId: string, row: number, col: number): GameState {
    this.validateCurrentPlayer(state, playerId)
    if (!state.drawnCard) throw new Error('Geen getrokken kaart om te plaatsen')
    const player = this.getPlayer(state, playerId)
    const oldCard = this.getCard(player, row, col)

    player.grid[row][col] = { ...state.drawnCard, faceUp: true }
    state.discardPile.push({ ...oldCard, faceUp: true })
    state.drawnCard = null
    state.drawnFromDiscard = false
    state.turnStep = 'choose-source'

    this.resolveColumns(state, player)
    return this.endTurn(state, playerId)
  }

  /**
   * Gooi de getrokken kaart weg. SPEC 11.1: alleen toegestaan voor kaarten van de
   * trekstapel — een kaart van de aflegstapel mag niet teruggelegd worden. Daarna
   * moet de speler nog een eigen face-down kaart omdraaien.
   */
  discardDrawnCard(state: GameState, playerId: string): GameState {
    this.validateCurrentPlayer(state, playerId)
    if (!state.drawnCard) throw new Error('Geen getrokken kaart om weg te gooien')
    if (state.drawnFromDiscard) throw new Error('Kaart van de aflegstapel moet gespeeld worden')

    state.discardPile.push({ ...state.drawnCard, faceUp: true })
    state.drawnCard = null
    state.turnStep = 'flip-after-discard'
    return state
  }

  /**
   * Draai een eigen face-down kaart om (na weggooien, of einde ronde).
   * SPEC 11.3: kolom-eliminatie is verplicht en gebeurt direct.
   */
  flipCard(state: GameState, playerId: string, row: number, col: number): GameState {
    this.validateCurrentPlayer(state, playerId)
    if (state.turnStep !== 'flip-after-discard') throw new Error('Nu geen kaart om te draaien')
    const player = this.getPlayer(state, playerId)
    const card = this.getCard(player, row, col)
    if (card.faceUp) throw new Error('Kaart is al omgedraaid')

    card.faceUp = true
    state.turnStep = 'choose-source'

    this.resolveColumns(state, player)
    return this.endTurn(state, playerId)
  }

  /**
   * Triggert het ronde-einde. SPEC 11.6: eindspeler triggert → overige spelers krijgen
   * elk nog 1 beurt → daarna pas alles omdraaien en scoren.
   */
  triggerRoundEnd(state: GameState, finisherPlayerId: string): GameState {
    state.roundEndTriggeredBy = finisherPlayerId
    state.phase = 'round-end'

    const finisherIndex = state.players.findIndex((p) => p.id === finisherPlayerId)
    const n = state.players.length
    const pending: string[] = []
    for (let i = 1; i < n; i++) {
      const p = state.players[(finisherIndex + i) % n]
      if (p.isConnected) pending.push(p.id)
    }
    state.pendingLastTurns = pending

    if (pending.length === 0) {
      return this.finalizeRound(state)
    }
    state.currentPlayerIndex = state.players.findIndex((p) => p.id === pending[0])
    return state
  }

  /**
   * Verwerkt het einde van een laatste beurt tijdens 'round-end'. Wanneer er geen
   * laatste beurten meer openstaan, wordt de ronde afgerekend. SPEC 11.6.
   */
  processLastTurn(state: GameState, playerId: string): GameState {
    state.pendingLastTurns = state.pendingLastTurns.filter((id) => id !== playerId)
    if (state.pendingLastTurns.length === 0) {
      return this.finalizeRound(state)
    }
    state.currentPlayerIndex = state.players.findIndex((p) => p.id === state.pendingLastTurns[0])
    return state
  }

  /**
   * Rekent de ronde af: alles omdraaien, kolom-check, scores + straf, totalen bijwerken.
   * SPEC 11.5: laagste score wordt pas bepaald nadat alle laatste beurten gespeeld zijn.
   * SPEC 11.10: het spel eindigt pas na afronding van de ronde.
   */
  finalizeRound(state: GameState): GameState {
    // SPEC 11.6: alle face-down kaarten omdraaien, daarna kolom-eliminatie.
    for (const player of state.players) {
      player.grid = revealAllCards(player.grid)
      this.resolveColumns(state, player)
    }

    const rawScores = state.players.map((p) => calculateRoundScore(p.grid))
    const lowest = Math.min(...rawScores)

    const scores: RoundScore[] = state.players.map((player, i) => {
      const raw = rawScores[i]
      const isRoundEnder = player.id === state.roundEndTriggeredBy
      const applied = applyPenalty(raw, isRoundEnder, lowest)
      player.totalScore += applied
      return {
        playerId: player.id,
        playerName: player.name,
        roundScore: applied,
        penaltyApplied: applied !== raw,
        totalScore: player.totalScore,
      }
    })

    state.lastRoundScores = scores
    state.drawnCard = null
    state.turnStep = 'choose-source'
    state.phase = 'scoring'

    // SPEC 11.10: spel eindigt als iemand MAX_SCORE haalt — pas na deze afronding.
    // SPEC 2.8: laagste totaalscore wint, maar bij gelijkspel om de laagste score
    // wordt een EXTRA ronde gespeeld i.p.v. het spel te beëindigen.
    if (state.players.some((p) => p.totalScore >= MAX_SCORE)) {
      const lowestTotal = Math.min(...state.players.map((p) => p.totalScore))
      const tiedForLowest = state.players.filter((p) => p.totalScore === lowestTotal)
      if (tiedForLowest.length === 1) {
        return this.endGame(state)
      }
      // Gelijkspel om de laagste totaalscore → val door naar een extra ronde.
    }
    return this.setupNextRound(state)
  }

  /**
   * Bereidt de volgende ronde voor (blijft in 'scoring' tot de host op "Volgende ronde"
   * drukt). SPEC 11.8: de afsluiter van de vorige ronde begint de volgende.
   */
  setupNextRound(state: GameState): GameState {
    state.roundNumber++
    const finisherIndex = state.players.findIndex((p) => p.id === state.roundEndTriggeredBy)
    state.startingPlayerIndex = finisherIndex >= 0 ? finisherIndex : 0
    state.pendingLastTurns = []
    state.drawnCard = null
    state.drawnFromDiscard = false
    for (const player of state.players) {
      player.grid = []
      player.initialFlipsRemaining = 0
    }
    state.phase = 'scoring'
    return state
  }

  /**
   * Start de volgende ronde (door de host getriggerd): nieuwe kaarten, initial-flip fase,
   * beginspeler = startingPlayerIndex. SPEC 11.8 + 11.9.
   */
  startNextRound(state: GameState): GameState {
    if (state.phase !== 'scoring') throw new Error('Kan nu geen nieuwe ronde starten')
    this.dealNewRound(state)
    state.currentPlayerIndex = state.startingPlayerIndex
    state.lastRoundScores = null
    return state
  }

  /** Bepaalt de volgende speler (kloksgewijs, modulo), met overslaan van disconnected spelers. */
  nextPlayer(state: GameState): GameState {
    const n = state.players.length
    let idx = state.currentPlayerIndex
    for (let i = 0; i < n; i++) {
      idx = (idx + 1) % n
      if (state.players[idx].isConnected) break
    }
    state.currentPlayerIndex = idx
    return state
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  /** Sluit een beurt af: tijdens round-end → laatste beurt verwerken, anders ronde-einde of volgende speler. */
  private endTurn(state: GameState, playerId: string): GameState {
    if (state.phase === 'round-end') {
      return this.processLastTurn(state, playerId)
    }
    const player = this.getPlayer(state, playerId)
    if (hasPlayerFinished(player.grid)) {
      return this.triggerRoundEnd(state, playerId)
    }
    return this.nextPlayer(state)
  }

  /** Deelt een verse ronde uit: shuffle, 12 kaarten p.p., bovenste kaart open op de aflegstapel. */
  private dealNewRound(state: GameState): void {
    const deck = shuffleDeck(createDeck())
    const { playerGrids, remainingDeck } = dealCards(deck, state.players.length)
    state.players.forEach((player, i) => {
      player.grid = playerGrids[i]
      player.initialFlipsRemaining = INITIAL_FLIP_COUNT
    })
    const top = remainingDeck.pop()!
    state.deck = remainingDeck
    state.discardPile = [{ ...top, faceUp: true }]
    state.phase = 'initial-flip'
    state.turnStep = 'choose-source'
    state.drawnCard = null
    state.drawnFromDiscard = false
    state.roundEndTriggeredBy = null
    state.pendingLastTurns = []
  }

  /** SPEC 11.3: verplichte kolom-eliminatie — verwijderde kaarten gaan face-up op de aflegstapel. */
  private resolveColumns(state: GameState, player: Player): void {
    const cols = checkColumnElimination(player.grid)
    if (cols.length === 0) return
    for (const col of cols) {
      for (let r = 0; r < player.grid.length; r++) {
        state.discardPile.push({ ...player.grid[r][col], faceUp: true })
      }
    }
    player.grid = eliminateColumns(player.grid, cols)
  }

  /** Berekent de eindstand en zet de fase op 'game-over'. Laagste totaal wint. */
  private endGame(state: GameState): GameState {
    const ranked = [...state.players].sort((a, b) => a.totalScore - b.totalScore)
    const finalScores: FinalScore[] = ranked.map((p, i) => ({
      playerId: p.id,
      playerName: p.name,
      totalScore: p.totalScore,
      rank: i + 1,
    }))
    state.finalScores = finalScores
    state.winner = ranked[0]?.name ?? null
    state.phase = 'game-over'
    return state
  }

  /** Speler met de hoogste som van zijn face-up kaarten; gelijkspel → laagste index. */
  private determineHighestSumPlayer(state: GameState): number {
    let bestIndex = 0
    let bestSum = -Infinity
    state.players.forEach((player, i) => {
      const sum = player.grid
        .flat()
        .filter((c) => c.faceUp)
        .reduce((acc, c) => acc + c.value, 0)
      if (sum > bestSum) {
        bestSum = sum
        bestIndex = i
      }
    })
    return bestIndex
  }

  private getPlayer(state: GameState, playerId: string): Player {
    const player = state.players.find((p) => p.id === playerId)
    if (!player) throw new Error('Speler niet gevonden')
    return player
  }

  private getCard(player: Player, row: number, col: number) {
    const card = player.grid[row]?.[col]
    if (!card) throw new Error('Ongeldige grid-positie')
    return card
  }

  private validatePlaying(state: GameState, playerId: string): void {
    if (state.phase !== 'playing' && state.phase !== 'round-end') {
      throw new Error('Niet in een speelfase')
    }
    this.validateCurrentPlayer(state, playerId)
  }

  private validateCurrentPlayer(state: GameState, playerId: string): void {
    const current = state.players[state.currentPlayerIndex]
    if (!current || current.id !== playerId) {
      throw new Error('Het is niet jouw beurt')
    }
  }
}
