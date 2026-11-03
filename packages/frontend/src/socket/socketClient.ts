import { io, type Socket } from 'socket.io-client'

// In productie serveert de backend de frontend (same-origin). In dev proxyt Vite
// '/socket.io' naar de backend (zie vite.config.ts). VITE_BACKEND_URL overschrijft beide.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

export function connectSocket(): void {
  if (!socket.connected) socket.connect()
}

export function disconnectSocket(): void {
  if (socket.connected) socket.disconnect()
}

// Eén emit-functie per client→server event uit SPEC.md sectie 5.
export const socketActions = {
  createRoom: (playerName: string) => socket.emit('create-room', { playerName }),
  joinRoom: (playerName: string, roomCode: string) =>
    socket.emit('join-room', { playerName, roomCode }),
  startGame: () => socket.emit('start-game'),
  flipInitial: (row: number, col: number) => socket.emit('flip-initial', { row, col }),
  drawFromDiscard: () => socket.emit('draw-from-discard'),
  drawFromDeck: () => socket.emit('draw-from-deck'),
  placeDrawnCard: (row: number, col: number) => socket.emit('place-drawn-card', { row, col }),
  discardDrawnCard: () => socket.emit('discard-drawn-card'),
  flipCard: (row: number, col: number) => socket.emit('flip-card', { row, col }),
  nextRound: () => socket.emit('next-round'),
  rejoinRoom: (roomCode: string, playerId: string) =>
    socket.emit('rejoin', { roomCode, playerId }),
}
