import type { Server as HttpServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import { RoomManager } from '../game/RoomManager'
import { GameEngine } from '../game/GameEngine'
import { registerHandlers } from './handlers'

let io: SocketIOServer | null = null

// Eén gedeelde RoomManager + GameEngine voor de hele server.
export const roomManager = new RoomManager()
export const gameEngine = new GameEngine()

/**
 * Initialiseert Socket.io op de gegeven HTTP-server en registreert de event
 * handlers voor elke nieuwe verbinding.
 */
export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: true },
  })

  io.on('connection', (socket) => {
    registerHandlers(io!, socket, roomManager, gameEngine)
  })

  return io
}

export function getIo(): SocketIOServer {
  if (!io) throw new Error('Socket.io is nog niet geïnitialiseerd')
  return io
}
