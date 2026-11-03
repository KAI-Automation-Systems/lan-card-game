import { create } from 'zustand'
import type { GameState, Player, RoomInfo, RoundScore, FinalScore } from '@skyjo/shared'

// Frontend store. Houdt ALLEEN een read-only kopie bij van de game state die de
// server stuurt — alle mutaties gebeuren op de backend. Afgeleide waarden
// (myPlayer, currentPlayer, isMyTurn) worden bij elke update herberekend.
export type GameStore = {
  // ─── State ───────────────────────────────────────────────────────────────
  gameState: GameState | null
  roomCode: string | null
  isHost: boolean
  playerName: string
  playerSocketId: string | null
  connected: boolean
  language: 'nl' | 'de'
  availableRooms: RoomInfo[]
  lastRoundScores: RoundScore[] | null
  finalScores: FinalScore[] | null
  winner: string | null
  error: string | null

  // ─── Afgeleide state ───────────────────────────────────────────────────────
  myPlayer: Player | null
  currentPlayer: Player | null
  isMyTurn: boolean

  // ─── Acties ─────────────────────────────────────────────────────────────────
  setGameState: (state: GameState) => void
  setRoomCode: (code: string) => void
  setIsHost: (isHost: boolean) => void
  setPlayerName: (name: string) => void
  setPlayerSocketId: (id: string | null) => void
  setConnected: (connected: boolean) => void
  setLanguage: (language: 'nl' | 'de') => void
  setAvailableRooms: (rooms: RoomInfo[]) => void
  setLastRoundScores: (scores: RoundScore[]) => void
  setFinalScores: (scores: FinalScore[]) => void
  setWinner: (winner: string) => void
  setError: (message: string | null) => void
  reset: () => void
}

type Derived = Pick<GameStore, 'myPlayer' | 'currentPlayer' | 'isMyTurn' | 'isHost'>

function computeDerived(
  gameState: GameState | null,
  playerSocketId: string | null,
  fallbackIsHost: boolean,
): Derived {
  if (!gameState) {
    return { myPlayer: null, currentPlayer: null, isMyTurn: false, isHost: fallbackIsHost }
  }
  const myPlayer = gameState.players.find((p) => p.socketId === playerSocketId) ?? null
  const currentPlayer = gameState.players[gameState.currentPlayerIndex] ?? null
  const isMyTurn =
    !!currentPlayer && !!playerSocketId && currentPlayer.socketId === playerSocketId
  // isHost wordt afgeleid uit de speler zelf — zo werkt host-overdracht (bij een
  // disconnect van de host) ook live op alle clients. Valt terug op de oude waarde
  // tijdens een korte reconnect-fase waarin myPlayer (nog) niet gematcht is.
  const isHost = myPlayer ? myPlayer.isHost : fallbackIsHost
  return { myPlayer, currentPlayer, isMyTurn, isHost }
}

const INITIAL = {
  gameState: null,
  roomCode: null,
  isHost: false,
  playerName: '',
  playerSocketId: null,
  connected: false,
  language: 'nl' as const,
  availableRooms: [],
  lastRoundScores: null,
  finalScores: null,
  winner: null,
  error: null,
  myPlayer: null,
  currentPlayer: null,
  isMyTurn: false,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL,

  setGameState: (state) =>
    set({ gameState: state, ...computeDerived(state, get().playerSocketId, get().isHost) }),

  setRoomCode: (code) => set({ roomCode: code }),

  setIsHost: (isHost) => set({ isHost }),

  setPlayerName: (name) => set({ playerName: name }),

  setPlayerSocketId: (id) =>
    set({ playerSocketId: id, ...computeDerived(get().gameState, id, get().isHost) }),

  setConnected: (connected) => set({ connected }),

  setLanguage: (language) => set({ language }),

  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),

  setLastRoundScores: (scores) => set({ lastRoundScores: scores }),

  setFinalScores: (scores) => set({ finalScores: scores }),

  setWinner: (winner) => set({ winner }),

  setError: (message) => set({ error: message }),

  reset: () => {
    try {
      localStorage.removeItem('skyjo_session')
    } catch {
      /* localStorage niet beschikbaar — negeer */
    }
    set({ ...INITIAL, language: get().language, playerName: get().playerName })
  },
}))
