import type { GameState, Player, RoomInfo } from '@skyjo/shared'
import { MAX_PLAYERS } from '@skyjo/shared'

/**
 * Beheert alle actieve kamers in-memory (Map<roomCode, GameState>).
 * Bevat geen spellogica — dat zit in de GameEngine.
 */
export class RoomManager {
  private rooms: Map<string, GameState> = new Map()

  /** Genereer een unieke code als "SKY-42" (SKY- prefix + 2 random cijfers). */
  generateRoomCode(): string {
    let code: string
    do {
      const digits = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0')
      code = `SKY-${digits}`
    } while (this.rooms.has(code))
    return code
  }

  /** Maakt een nieuwe kamer in 'lobby' fase met de host als eerste speler. */
  createRoom(hostSocketId: string, hostName: string): GameState {
    const roomCode = this.generateRoomCode()
    const host = createPlayer(hostName, hostSocketId, true)
    const state: GameState = {
      roomCode,
      phase: 'lobby',
      players: [host],
      deck: [],
      discardPile: [],
      currentPlayerIndex: 0,
      roundNumber: 0,
      startingPlayerIndex: 0,
      roundEndTriggeredBy: null,
      pendingLastTurns: [],
      drawnCard: null,
      drawnFromDiscard: false,
      turnStep: 'choose-source',
      lastRoundScores: null,
      finalScores: null,
      winner: null,
    }
    this.rooms.set(roomCode, state)
    return state
  }

  /**
   * Voegt een speler toe aan een bestaande lobby. Geeft null terug wanneer joinen
   * niet mogelijk is (kamer bestaat niet, niet in lobby, of vol).
   */
  joinRoom(roomCode: string, socketId: string, playerName: string): GameState | null {
    const state = this.rooms.get(roomCode)
    if (!state) return null
    if (state.phase !== 'lobby') return null
    if (state.players.length >= MAX_PLAYERS) return null

    state.players.push(createPlayer(playerName, socketId, false))
    this.rooms.set(roomCode, state)
    return state
  }

  /**
   * Behandelt een socket-disconnect.
   * - In de lobby: de speler wordt verwijderd (host-rol gaat over, lege kamer weg).
   * - Tijdens een spel: de speler wordt NIET verwijderd maar gemarkeerd als
   *   `isConnected = false`, zodat grids/indices intact blijven en hij later kan
   *   reconnecten. De host-rol gaat over naar de eerstvolgende verbonden speler.
   * - Zodra niemand meer verbonden is, wordt de kamer opgeruimd.
   */
  handleDisconnect(socketId: string): { roomCode: string; state: GameState } | null {
    const found = this.getRoomBySocketId(socketId)
    if (!found) return null
    const { roomCode, state } = found
    const player = state.players.find((p) => p.socketId === socketId)
    if (!player) return null

    if (state.phase === 'lobby') {
      const wasHost = player.isHost
      state.players = state.players.filter((p) => p.socketId !== socketId)
      if (state.players.length === 0) {
        this.rooms.delete(roomCode)
        return { roomCode, state }
      }
      if (wasHost && !state.players.some((p) => p.isHost)) {
        state.players[0].isHost = true
      }
      this.rooms.set(roomCode, state)
      return { roomCode, state }
    }

    // Tijdens het spel: markeer offline maar behoud de speler voor reconnect.
    player.isConnected = false
    if (player.isHost) {
      player.isHost = false
      const next = state.players.find((p) => p.isConnected)
      if (next) next.isHost = true
      else player.isHost = true // niemand verbonden: laat host-rol bij deze speler
    }

    if (!state.players.some((p) => p.isConnected)) {
      this.rooms.delete(roomCode)
      return { roomCode, state }
    }

    this.rooms.set(roomCode, state)
    return { roomCode, state }
  }

  /**
   * Koppelt een reconnectende speler aan zijn nieuwe socketId op basis van zijn
   * persistente playerId. Geeft de huidige state terug of null als het niet lukt.
   */
  reconnect(roomCode: string, playerId: string, newSocketId: string): GameState | null {
    const state = this.rooms.get(roomCode)
    if (!state) return null
    const player = state.players.find((p) => p.id === playerId)
    if (!player) return null
    player.socketId = newSocketId
    player.isConnected = true
    this.rooms.set(roomCode, state)
    return state
  }

  getRoom(roomCode: string): GameState | null {
    return this.rooms.get(roomCode) ?? null
  }

  getRoomBySocketId(socketId: string): { roomCode: string; state: GameState } | null {
    for (const [roomCode, state] of this.rooms) {
      if (state.players.some((p) => p.socketId === socketId)) {
        return { roomCode, state }
      }
    }
    return null
  }

  /** Lijst van joinbare kamers (alleen 'lobby' fase) voor discovery. */
  getAllRooms(): RoomInfo[] {
    const result: RoomInfo[] = []
    for (const state of this.rooms.values()) {
      if (state.phase !== 'lobby') continue
      const host = state.players.find((p) => p.isHost) ?? state.players[0]
      result.push({
        roomCode: state.roomCode,
        playerCount: state.players.length,
        maxPlayers: MAX_PLAYERS,
        hostName: host?.name ?? '',
        phase: state.phase,
      })
    }
    return result
  }

  updateRoom(roomCode: string, state: GameState): void {
    this.rooms.set(roomCode, state)
  }
}

function createPlayer(name: string, socketId: string, isHost: boolean): Player {
  return {
    id: `p_${Math.random().toString(36).slice(2, 10)}`,
    name,
    socketId,
    grid: [],
    totalScore: 0,
    isConnected: true,
    isHost,
    initialFlipsRemaining: 0,
  }
}
