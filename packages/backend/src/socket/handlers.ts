import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { Card, ClientEvents, GameState } from '@skyjo/shared'
import type { RoomManager } from '../game/RoomManager'
import type { GameEngine } from '../game/GameEngine'

/**
 * Verbindt alle socket events met de RoomManager en GameEngine.
 * Alle game state mutaties lopen via de GameEngine (server-authoritative).
 */
export function registerHandlers(
  io: SocketIOServer,
  socket: Socket,
  roomManager: RoomManager,
  gameEngine: GameEngine,
): void {
  // Helper: voer een actie uit op de kamer van deze socket en vang fouten op.
  const withRoom = (
    fn: (ctx: { roomCode: string; state: GameState; playerId: string }) => GameState,
  ) => {
    try {
      const found = roomManager.getRoomBySocketId(socket.id)
      if (!found) throw new Error('Je zit niet in een kamer')
      const player = found.state.players.find((p) => p.socketId === socket.id)
      if (!player) throw new Error('Speler niet gevonden')
      const next = fn({ roomCode: found.roomCode, state: found.state, playerId: player.id })
      roomManager.updateRoom(found.roomCode, next)
      emitRoomState(io, found.roomCode, next)
    } catch (err) {
      socket.emit('error', { message: errorMessage(err) })
    }
  }

  // Stuur de huidige kamerlijst direct naar de net verbonden client, zodat de
  // join-view discovery toont zonder te wachten op een volgende wijziging.
  socket.emit('room-discovery', { rooms: roomManager.getAllRooms() })

  socket.on('create-room', ({ playerName }: ClientEvents['create-room']) => {
    const state = roomManager.createRoom(socket.id, playerName)
    socket.join(state.roomCode)
    socket.emit('room-created', { roomCode: state.roomCode, state: sanitizePublic(state) })
    broadcastDiscovery(io, roomManager)
  })

  socket.on('join-room', ({ playerName, roomCode }: ClientEvents['join-room']) => {
    const state = roomManager.joinRoom(roomCode, socket.id, playerName)
    if (!state) {
      socket.emit('error', { message: 'Kamer niet beschikbaar' })
      return
    }
    socket.join(roomCode)
    emitRoomState(io, roomCode, state)
    broadcastDiscovery(io, roomManager)
  })

  socket.on('start-game', () => {
    try {
      const found = roomManager.getRoomBySocketId(socket.id)
      if (!found) throw new Error('Je zit niet in een kamer')
      const player = found.state.players.find((p) => p.socketId === socket.id)
      if (!player?.isHost) throw new Error('Alleen de host kan het spel starten')
      const next = gameEngine.startGame(found.state)
      roomManager.updateRoom(found.roomCode, next)
      // Sanitize: bij start zijn alle kaarten face-down → waarden verbergen.
      io.to(found.roomCode).emit('game-started', { state: sanitizePublic(next) })
      broadcastDiscovery(io, roomManager)
    } catch (err) {
      socket.emit('error', { message: errorMessage(err) })
    }
  })

  socket.on('flip-initial', ({ row, col }: ClientEvents['flip-initial']) => {
    withRoom(({ state, playerId }) => gameEngine.flipInitialCard(state, playerId, row, col))
  })

  socket.on('draw-from-discard', () => {
    withRoom(({ state, playerId }) => gameEngine.drawFromDiscard(state, playerId))
  })

  socket.on('draw-from-deck', () => {
    withRoom(({ state, playerId }) => gameEngine.drawFromDeck(state, playerId))
  })

  socket.on('place-drawn-card', ({ row, col }: ClientEvents['place-drawn-card']) => {
    withRoom(({ state, playerId }) => gameEngine.placeDrawnCard(state, playerId, row, col))
  })

  socket.on('discard-drawn-card', () => {
    withRoom(({ state, playerId }) => gameEngine.discardDrawnCard(state, playerId))
  })

  socket.on('flip-card', ({ row, col }: ClientEvents['flip-card']) => {
    withRoom(({ state, playerId }) => gameEngine.flipCard(state, playerId, row, col))
  })

  socket.on('next-round', () => {
    try {
      const found = roomManager.getRoomBySocketId(socket.id)
      if (!found) throw new Error('Je zit niet in een kamer')
      const player = found.state.players.find((p) => p.socketId === socket.id)
      if (!player?.isHost) throw new Error('Alleen de host kan de volgende ronde starten')
      const next = gameEngine.startNextRound(found.state)
      roomManager.updateRoom(found.roomCode, next)
      emitRoomState(io, found.roomCode, next)
    } catch (err) {
      socket.emit('error', { message: errorMessage(err) })
    }
  })

  // Reconnect (fase 5): de client bewaart {roomCode, playerId} en koppelt zijn
  // nieuwe socket weer aan de bestaande speler. Geen SPEC-event, dus lokaal getypt.
  socket.on('rejoin', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const state = roomManager.reconnect(roomCode, playerId, socket.id)
    if (!state) {
      socket.emit('rejoin-failed')
      return
    }
    socket.join(roomCode)
    // De reconnectende speler krijgt zijn eigen perspectief; de rest een update
    // zodat ze zien dat hij weer online is (zonder ronde/gameover events te herhalen).
    sendStateToSocket(socket, state)
    io.to(roomCode).except(socket.id).emit('state-update', { state: sanitizePublic(state) })
    broadcastDiscovery(io, roomManager)
  })

  socket.on('disconnect', () => {
    const result = roomManager.handleDisconnect(socket.id)
    if (!result) return
    // Kamer bestaat nog → state-update; anders is hij al opgeruimd.
    if (roomManager.getRoom(result.roomCode)) {
      emitRoomState(io, result.roomCode, result.state)
    }
    broadcastDiscovery(io, roomManager)
  })
}

/**
 * Verstuurt de juiste state naar de kamer en kiest het juiste event op basis van fase.
 * Privacy (SPEC 2.4): de getrokken kaart is alleen zichtbaar voor de huidige speler,
 * en de waarde van face-down kaarten (eigen grid, andermans grid én de trekstapel)
 * wordt nooit meegestuurd — anders kan iemand via DevTools spieken.
 */
function emitRoomState(io: SocketIOServer, roomCode: string, state: GameState): void {
  const pub = sanitizePublic(state)

  if (state.phase === 'game-over') {
    io.to(roomCode).emit('game-over', {
      finalScores: state.finalScores ?? [],
      winner: state.winner ?? '',
    })
    io.to(roomCode).emit('state-update', { state: pub })
    return
  }

  if (state.phase === 'scoring' && state.lastRoundScores) {
    io.to(roomCode).emit('round-ended', { scores: state.lastRoundScores, state: pub })
    io.to(roomCode).emit('state-update', { state: pub })
    return
  }

  const currentSocketId = state.players[state.currentPlayerIndex]?.socketId
  if (state.drawnCard && currentSocketId) {
    // Iedereen behalve de huidige speler ziet de getrokken kaart niet.
    io.to(roomCode).except(currentSocketId).emit('state-update', { state: pub })
    io.to(currentSocketId).emit('state-update', { state: sanitizePrivate(state) })
  } else {
    io.to(roomCode).emit('state-update', { state: pub })
  }
}

/** Stuurt de huidige state (juist perspectief) naar één socket — gebruikt bij reconnect. */
function sendStateToSocket(socket: Socket, state: GameState): void {
  const isCurrent = state.players[state.currentPlayerIndex]?.socketId === socket.id
  const view = isCurrent ? sanitizePrivate(state) : sanitizePublic(state)
  socket.emit('state-update', { state: view })
  if (state.phase === 'scoring' && state.lastRoundScores) {
    socket.emit('round-ended', { scores: state.lastRoundScores, state: view })
  }
  if (state.phase === 'game-over') {
    socket.emit('game-over', {
      finalScores: state.finalScores ?? [],
      winner: state.winner ?? '',
    })
  }
}

/**
 * Verbergt de waarde van een face-down kaart (faceUp-kaarten blijven ongewijzigd).
 * SPEC 2.4 / privacy: een sentinel (-999) i.p.v. een echte kaartwaarde (0 is een
 * geldige kaart!) zodat clients nooit een waarde kunnen afleiden of per ongeluk tonen.
 */
const HIDDEN_VALUE = -999
function hideCard(card: Card): Card {
  return card.faceUp ? card : { ...card, value: HIDDEN_VALUE }
}

/**
 * Publieke state: geen getrokken kaart, en alle face-down kaartwaarden (grids + deck)
 * verborgen. De faceUp-vlag blijft correct zodat de UI weet wat onthuld is.
 */
function sanitizePublic(state: GameState): GameState {
  return {
    ...state,
    drawnCard: null,
    deck: state.deck.map(hideCard),
    players: state.players.map((p) => ({
      ...p,
      grid: p.grid.map((row) => row.map(hideCard)),
    })),
  }
}

/** Als publiek, maar mét de getrokken kaart — voor de speler die aan de beurt is. */
function sanitizePrivate(state: GameState): GameState {
  return { ...sanitizePublic(state), drawnCard: state.drawnCard }
}

function broadcastDiscovery(io: SocketIOServer, roomManager: RoomManager): void {
  io.emit('room-discovery', { rooms: roomManager.getAllRooms() })
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Onbekende fout'
}
