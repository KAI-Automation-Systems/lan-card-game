// ─── KAART ────────────────────────────────────────────────────────────────────
export type Card = {
  id: string       // unieke id, bijv. "card_0" t/m "card_149"
  value: number    // -2 t/m 12
  faceUp: boolean  // true = zichtbaar voor alle spelers
}

// ─── SPELER ───────────────────────────────────────────────────────────────────
export type Player = {
  id: string
  name: string
  socketId: string
  // Grid: 3 rijen x 4 kolommen — grid[rij][kolom]
  grid: Card[][]
  totalScore: number
  isConnected: boolean
  isHost: boolean
  initialFlipsRemaining: number  // Hoeveel startkaarten nog omgedraaid moeten worden (start: 2)
}

// ─── GAME FASE ────────────────────────────────────────────────────────────────
export type GamePhase =
  | 'lobby'          // Wachtkamer, nog niet gestart
  | 'initial-flip'   // Alle spelers draaien simultaan 2 kaarten om
  | 'playing'        // Normaal spel, spelers spelen op beurt
  | 'round-end'      // Ronde voorbij, laatste beurten worden uitgespeeld
  | 'scoring'        // Scores worden berekend en getoond
  | 'game-over'      // Spel afgelopen

// ─── BEURT STAP ───────────────────────────────────────────────────────────────
export type TurnStep =
  | 'choose-source'    // Kies: aflegstapel of trekstapel
  | 'drawn-card'       // Kaart getrokken van trekstapel, kies: spelen of weggooien
  | 'flip-after-discard' // Na weggooien: draai een eigen kaart om

// ─── GAME STATE ───────────────────────────────────────────────────────────────
export type GameState = {
  roomCode: string
  phase: GamePhase
  players: Player[]
  deck: Card[]
  discardPile: Card[]             // Laatste kaart is de zichtbare bovenste kaart
  currentPlayerIndex: number      // Index in players array
  roundNumber: number
  startingPlayerIndex: number     // Wie begon deze ronde (voor volgende ronde)
  roundEndTriggeredBy: string | null  // playerId van degene die de ronde beeindigde
  pendingLastTurns: string[]      // playerIds die nog 1 laatste beurt hebben
  drawnCard: Card | null          // Kaart die deze beurt getrokken is (alleen zichtbaar voor huidige speler)
  drawnFromDiscard: boolean       // true = getrokken van aflegstapel (verplicht spelen, niet weggooien)
  turnStep: TurnStep
  // Resultaten — gevuld door de GameEngine zodra ze beschikbaar zijn
  lastRoundScores: RoundScore[] | null  // Scores van de laatst afgeronde ronde
  finalScores: FinalScore[] | null      // Eindstand zodra het spel voorbij is
  winner: string | null                 // playerName van de winnaar bij game-over
}

// ─── SOCKET EVENTS ────────────────────────────────────────────────────────────
// Client naar server
export type ClientEvents = {
  'create-room': { playerName: string }
  'join-room': { playerName: string; roomCode: string }
  'start-game': {}
  'flip-initial': { row: number; col: number }
  'draw-from-discard': {}
  'draw-from-deck': {}
  'place-drawn-card': { row: number; col: number }
  'discard-drawn-card': {}
  'flip-card': { row: number; col: number }
  'next-round': {}
}

// Server naar client
export type ServerEvents = {
  'room-created': { roomCode: string; state: GameState }
  'room-discovery': { rooms: RoomInfo[] }
  'player-joined': { state: GameState }
  'game-started': { state: GameState }
  'state-update': { state: GameState }
  'round-ended': { scores: RoundScore[]; state: GameState }
  'game-over': { finalScores: FinalScore[]; winner: string }
  'error': { message: string }
}

// ─── HULP TYPES ───────────────────────────────────────────────────────────────
export type RoomInfo = {
  roomCode: string
  playerCount: number
  maxPlayers: number
  hostName: string
  phase: GamePhase
}

export type RoundScore = {
  playerId: string
  playerName: string
  roundScore: number
  penaltyApplied: boolean   // true als score verdubbeld is
  totalScore: number
}

export type FinalScore = {
  playerId: string
  playerName: string
  totalScore: number
  rank: number
}
