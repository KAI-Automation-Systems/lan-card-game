import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FinalScore, GameState, RoomInfo, RoundScore } from '@skyjo/shared'
import { socket, connectSocket, socketActions } from '../socket/socketClient'
import { useGameStore } from '../store/gameStore'
import { toast } from '../store/toastStore'

const SESSION_KEY = 'skyjo_session'

/** Bewaart {roomCode, playerId} zodat we na een drop kunnen reconnecten. */
function persistSession(state: GameState): void {
  const me = state.players.find((p) => p.socketId === socket.id)
  if (!me) return
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: state.roomCode, playerId: me.id }))
  } catch {
    /* localStorage niet beschikbaar — negeer */
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* negeer */
  }
}

/**
 * Registreert alle server → client event listeners en koppelt ze aan de store.
 * Wordt één keer gemount (in App). Navigatie gebeurt op fase-relevante events.
 */
export function useSocket() {
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  navRef.current = navigate

  useEffect(() => {
    connectSocket()

    const onConnect = () => {
      const s = useGameStore.getState()
      s.setConnected(true)
      s.setPlayerSocketId(socket.id ?? null)
      // Bij (her)verbinden: probeer een bewaarde sessie te hervatten.
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (raw) {
          const { roomCode, playerId } = JSON.parse(raw) as { roomCode: string; playerId: string }
          if (roomCode && playerId) socketActions.rejoinRoom(roomCode, playerId)
        }
      } catch {
        /* negeer */
      }
    }
    const onDisconnect = () => useGameStore.getState().setConnected(false)

    const onRoomCreated = ({ roomCode, state }: { roomCode: string; state: GameState }) => {
      const s = useGameStore.getState()
      s.setRoomCode(roomCode)
      s.setGameState(state)
      persistSession(state)
      navRef.current('/lobby', { state: { mode: 'host' } })
    }

    const onRejoinFailed = () => clearSession()

    const onStateUpdate = ({ state }: { state: GameState }) => {
      const s = useGameStore.getState()
      s.setGameState(state)
      s.setRoomCode(state.roomCode)
      persistSession(state)
      const path = window.location.pathname
      // Een joiner zit al op /lobby (JoinView) en schakelt vanzelf naar de
      // wachtkamer zodra de store gevuld is. Alleen navigeren als we nog niet in
      // de lobby zijn (bijv. een late binnenkomst).
      if (state.phase === 'lobby') {
        if (path !== '/lobby') navRef.current('/lobby')
      } else if (
        state.phase === 'initial-flip' ||
        state.phase === 'playing' ||
        state.phase === 'round-end'
      ) {
        // Bijv. de volgende ronde die start vanaf het ronde-einde scherm.
        if (path !== '/game') navRef.current('/game')
      }
      // 'scoring' en 'game-over' worden door round-ended / game-over events afgehandeld.
    }

    const onGameStarted = ({ state }: { state: GameState }) => {
      useGameStore.getState().setGameState(state)
      persistSession(state)
      navRef.current('/game')
    }

    const onRoundEnded = ({ scores, state }: { scores: RoundScore[]; state: GameState }) => {
      const s = useGameStore.getState()
      s.setGameState(state)
      s.setLastRoundScores(scores)
      persistSession(state)
      navRef.current('/round-end')
    }

    const onGameOver = ({
      finalScores,
      winner,
    }: {
      finalScores: FinalScore[]
      winner: string
    }) => {
      const s = useGameStore.getState()
      s.setFinalScores(finalScores)
      s.setWinner(winner)
      navRef.current('/game-over')
    }

    const onRoomDiscovery = ({ rooms }: { rooms: RoomInfo[] }) =>
      useGameStore.getState().setAvailableRooms(rooms)

    const onError = ({ message }: { message: string }) => {
      useGameStore.getState().setError(message)
      toast.error(message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('room-created', onRoomCreated)
    socket.on('state-update', onStateUpdate)
    socket.on('game-started', onGameStarted)
    socket.on('round-ended', onRoundEnded)
    socket.on('game-over', onGameOver)
    socket.on('room-discovery', onRoomDiscovery)
    socket.on('rejoin-failed', onRejoinFailed)
    socket.on('error', onError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('room-created', onRoomCreated)
      socket.off('state-update', onStateUpdate)
      socket.off('game-started', onGameStarted)
      socket.off('round-ended', onRoundEnded)
      socket.off('game-over', onGameOver)
      socket.off('room-discovery', onRoomDiscovery)
      socket.off('rejoin-failed', onRejoinFailed)
      socket.off('error', onError)
    }
  }, [])
}
