import type { Card } from './types'
import { DECK_DISTRIBUTION, GRID_ROWS, GRID_COLS, CARDS_PER_PLAYER } from './constants'

// ─── PURE GAME LOGIC ──────────────────────────────────────────────────────────
// Alle functies hier zijn puur: ze muteren hun input NIET en hebben geen
// side-effects. Zie SPEC.md sectie 2 (spelregels) en sectie 11 (kritieke regels).

/**
 * Bouwt een volledig Skyjo-deck van 150 kaarten op basis van DECK_DISTRIBUTION.
 * Elke kaart krijgt een unieke id (`card_${index}`) en start face-down.
 * Zie SPEC.md sectie 2.2.
 */
export function createDeck(): Card[] {
  const deck: Card[] = []
  let index = 0
  for (const [value, count] of Object.entries(DECK_DISTRIBUTION)) {
    const numericValue = Number(value)
    for (let i = 0; i < count; i++) {
      deck.push({ id: `card_${index}`, value: numericValue, faceUp: false })
      index++
    }
  }
  return deck
}

/**
 * Fisher-Yates shuffle. Muteert het originele array niet — geeft een nieuwe array terug.
 * Zie SPEC.md sectie 2.3 stap 1.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const result = [...deck]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Deelt 12 kaarten per speler uit als 3x4 grid (rij-major: grid[rij][kolom]) en
 * geeft de resterende trekstapel terug. Zie SPEC.md sectie 2.3 stap 2-4.
 */
export function dealCards(
  deck: Card[],
  playerCount: number,
): { playerGrids: Card[][][]; remainingDeck: Card[] } {
  const needed = playerCount * CARDS_PER_PLAYER
  const drawn = deck.slice(0, needed)
  const remainingDeck = deck.slice(needed)

  const playerGrids: Card[][][] = []
  for (let p = 0; p < playerCount; p++) {
    const grid: Card[][] = []
    for (let row = 0; row < GRID_ROWS; row++) {
      const rowCards: Card[] = []
      for (let col = 0; col < GRID_COLS; col++) {
        const cardIndex = p * CARDS_PER_PLAYER + row * GRID_COLS + col
        rowCards.push(drawn[cardIndex])
      }
      grid.push(rowCards)
    }
    playerGrids.push(grid)
  }

  return { playerGrids, remainingDeck }
}

/**
 * Geeft de indices terug van kolommen die verwijderd moeten worden: alle 3 kaarten
 * face-up én exact dezelfde waarde (strict, dus -1 ≠ 1). Zie SPEC.md sectie 2.5 / 4.4.
 */
export function checkColumnElimination(grid: Card[][]): number[] {
  const result: number[] = []
  const colCount = grid[0]?.length ?? 0
  for (let col = 0; col < colCount; col++) {
    const top = grid[0][col]
    const mid = grid[1][col]
    const bot = grid[2][col]
    if (!top || !mid || !bot) continue
    const allFaceUp = top.faceUp && mid.faceUp && bot.faceUp
    const allEqual = top.value === mid.value && mid.value === bot.value
    if (allFaceUp && allEqual) result.push(col)
  }
  return result
}

/**
 * Verwijdert de opgegeven kolommen uit het grid en geeft een nieuw (smaller) grid terug.
 * Zie SPEC.md sectie 2.5.
 */
export function eliminateColumns(grid: Card[][], columnIndices: number[]): Card[][] {
  const toRemove = new Set(columnIndices)
  return grid.map((row) => row.filter((_, col) => !toRemove.has(col)))
}

/**
 * Telt alle kaartwaarden in het grid op (negatief telt af). Zie SPEC.md sectie 2.6.
 */
export function calculateRoundScore(grid: Card[][]): number {
  let total = 0
  for (const row of grid) {
    for (const card of row) {
      total += card.value
    }
  }
  return total
}

/**
 * Past de straf voor de eindspeler toe. Zie SPEC.md sectie 2.6 en regels 11.4.
 * - Niet de eindspeler → ongewijzigd.
 * - Eindspeler met score <= laagste → geen straf.
 * - Eindspeler met score > laagste → verdubbel, maar ALLEEN als score > 0.
 */
export function applyPenalty(
  roundScore: number,
  isRoundEnder: boolean,
  lowestScoreInRound: number,
): number {
  if (!isRoundEnder) return roundScore
  if (roundScore <= lowestScoreInRound) return roundScore
  if (roundScore <= 0) return roundScore
  return roundScore * 2
}

/**
 * Zet alle kaarten in het grid face-up. Geeft een nieuw grid terug.
 * Zie SPEC.md sectie 2.6 stap 3.
 */
export function revealAllCards(grid: Card[][]): Card[][] {
  return grid.map((row) => row.map((card) => ({ ...card, faceUp: true })))
}

/** Telt het aantal face-down kaarten in het grid. */
export function countFaceDownCards(grid: Card[][]): number {
  let count = 0
  for (const row of grid) {
    for (const card of row) {
      if (!card.faceUp) count++
    }
  }
  return count
}

/** True wanneer een speler geen face-down kaarten meer heeft (laatste kaart omgedraaid). */
export function hasPlayerFinished(grid: Card[][]): boolean {
  return countFaceDownCards(grid) === 0
}

/**
 * Recyclet de aflegstapel tot nieuwe trekstapel wanneer het deck leeg is. De bovenste
 * (zichtbare) kaart van de aflegstapel blijft liggen. Zie SPEC.md regel 11.7.
 */
export function recycleDeck(
  currentDeck: Card[],
  discardPile: Card[],
): { newDeck: Card[]; newDiscardPile: Card[] } {
  if (currentDeck.length > 0) {
    return { newDeck: currentDeck, newDiscardPile: discardPile }
  }
  if (discardPile.length === 0) {
    return { newDeck: [], newDiscardPile: [] }
  }
  const topCard = discardPile[discardPile.length - 1]
  const rest = discardPile.slice(0, -1)
  // Resterende kaarten weer face-down maken en schudden als nieuw deck.
  const newDeck = shuffleDeck(rest.map((card) => ({ ...card, faceUp: false })))
  return { newDeck, newDiscardPile: [topCard] }
}
