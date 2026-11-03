import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import LanguageToggle from '../components/LanguageToggle'
import Avatar from '../components/Avatar'
import NameSheet from '../components/NameSheet'
import { useGameStore } from '../store/gameStore'
import { socketActions } from '../socket/socketClient'
import { toast } from '../store/toastStore'

// Spelerlimieten uit SPEC.md sectie 1 — hier als UI-literals omdat de frontend
// een read-only view is en geen runtime game-logic uit @skyjo/shared importeert.
const MIN_PLAYERS = 2
const MAX_PLAYERS = 8

type LobbyMode = 'host' | 'join'

export default function LobbyScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const mode = ((location.state as { mode?: LobbyMode } | null)?.mode ?? 'host') as LobbyMode

  const gameState = useGameStore((s) => s.gameState)
  const isHost = useGameStore((s) => s.isHost)
  const myPlayer = useGameStore((s) => s.myPlayer)
  const reset = useGameStore((s) => s.reset)

  // Bepaal welke view we tonen op basis van de echte store-state.
  const inRoom = !!gameState && !!myPlayer

  const handleBack = () => {
    // Verlaat de kamer en wis de reconnect-sessie zodat we niet teruggetrokken worden.
    reset()
    navigate('/')
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={handleBack} className="text-game-muted hover:text-game-text">
          ← {t('lobby.back')}
        </button>
        <LanguageToggle />
      </div>

      {inRoom && isHost ? (
        <HostView />
      ) : inRoom ? (
        <WaitingView />
      ) : mode === 'join' ? (
        <JoinView />
      ) : (
        <HostView />
      )}
    </div>
  )
}

// ─── Host: kamercode, QR, spelerslijst, start ───────────────────────────────
function HostView() {
  const { t } = useTranslation()
  const gameState = useGameStore((s) => s.gameState)
  const roomCode = useGameStore((s) => s.roomCode) ?? gameState?.roomCode ?? ''
  const players = gameState?.players ?? []
  const [copied, setCopied] = useState(false)

  const canStart = players.length >= MIN_PLAYERS
  const joinUrl = `http://${window.location.hostname}:3000`

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      toast.success(t('lobby.copied'))
    } catch {
      /* clipboard niet beschikbaar — negeer */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex flex-1 flex-col">
      <button onClick={copyCode} className="panel relative w-full px-6 py-5 text-center">
        <div className="text-xs uppercase tracking-widest text-game-muted">
          {t('lobby.roomCode')}
        </div>
        <div
          className="mt-1 font-mono text-5xl font-extrabold tracking-[0.3em] text-game-accent"
          style={{ textShadow: '0 0 18px rgba(129,140,248,0.5)' }}
        >
          {roomCode}
        </div>
        <div className="mt-2 text-xs text-game-muted">{t('lobby.tapToCopy')}</div>

        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute left-1/2 top-2 -translate-x-1/2 rounded-pill bg-game-accent px-3 py-1 text-xs font-bold text-game-bg"
            >
              {t('lobby.copied')}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* QR code — gasten scannen om direct naar de app te gaan */}
      <div className="mt-4 flex flex-col items-center">
        <div className="rounded-2xl bg-white p-3 shadow-lg">
          <QRCodeSVG value={joinUrl} size={150} level="M" />
        </div>
        <div className="mt-2 text-xs text-game-muted">{t('lobby.scanToJoin')}</div>
      </div>

      <PlayerList players={players} />

      <div className="mt-6">
        <button
          disabled={!canStart}
          onClick={() => socketActions.startGame()}
          className="btn-primary w-full"
        >
          {t('lobby.start')}
        </button>
        {!canStart && (
          <p className="mt-2 text-center text-xs text-game-muted">{t('lobby.minPlayers')}</p>
        )}
      </div>
    </div>
  )
}

// ─── Joiner die al in de kamer zit: wachten op host ─────────────────────────
function WaitingView() {
  const { t } = useTranslation()
  const gameState = useGameStore((s) => s.gameState)
  const roomCode = useGameStore((s) => s.roomCode) ?? gameState?.roomCode ?? ''
  const players = gameState?.players ?? []

  return (
    <div className="flex flex-1 flex-col">
      <div className="panel w-full px-6 py-5 text-center">
        <div className="text-xs uppercase tracking-widest text-game-muted">
          {t('lobby.roomCode')}
        </div>
        <div
          className="mt-1 font-mono text-5xl font-extrabold tracking-[0.3em] text-game-accent"
          style={{ textShadow: '0 0 18px rgba(129,140,248,0.5)' }}
        >
          {roomCode}
        </div>
      </div>

      <PlayerList players={players} />

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-game-muted">
        <span>{t('lobby.waitingHost')}</span>
        <span className="flex gap-1">
          <span className="dot inline-block h-1.5 w-1.5 rounded-full bg-game-muted" />
          <span
            className="dot inline-block h-1.5 w-1.5 rounded-full bg-game-muted"
            style={{ animationDelay: '0.2s' }}
          />
          <span
            className="dot inline-block h-1.5 w-1.5 rounded-full bg-game-muted"
            style={{ animationDelay: '0.4s' }}
          />
        </span>
      </div>
    </div>
  )
}

// ─── Joiner: discovery + handmatige invoer ──────────────────────────────────
function JoinView() {
  const { t } = useTranslation()
  const availableRooms = useGameStore((s) => s.availableRooms)
  const playerName = useGameStore((s) => s.playerName)
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const [manualCode, setManualCode] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const [pendingCode, setPendingCode] = useState<string | null>(null)

  // Na 5s zonder kamers: stop de spinner en toon handmatige invoer prominent.
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(id)
  }, [])

  const rooms = availableRooms.filter((r) => r.phase === 'lobby')
  const showSpinner = rooms.length === 0 && !timedOut

  const doJoin = (code: string) => {
    const c = code.trim().toUpperCase()
    if (!c) return
    if (playerName.trim().length < 2) {
      // Geen naam bekend (directe navigatie): vraag deze eerst.
      setPendingCode(c)
      return
    }
    socketActions.joinRoom(playerName, c)
  }

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-3 font-bold text-game-text">{t('lobby.join')}</h2>

      {showSpinner ? (
        <div className="panel flex flex-col items-center gap-3 py-10">
          <div className="spin h-8 w-8 rounded-full border-2 border-game-muted border-t-game-accent" />
          <span className="text-sm text-game-muted">{t('lobby.findingRooms')}</span>
        </div>
      ) : rooms.length === 0 ? (
        <div className="panel py-8 text-center text-sm text-game-muted">{t('lobby.noRooms')}</div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {rooms.map((room, i) => (
              <motion.button
                key={room.roomCode}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                onClick={() => doJoin(room.roomCode)}
                className="panel flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:border-game-accent/50"
              >
                <Avatar name={room.hostName} index={i} />
                <div className="flex-1">
                  <div className="font-bold text-game-text">{room.hostName}</div>
                  <div className="text-xs text-game-muted">
                    {room.roomCode} · {room.playerCount}/{room.maxPlayers}{' '}
                    {t('lobby.players').toLowerCase()}
                  </div>
                </div>
                <span className="rounded-pill bg-game-accent px-4 py-1.5 text-sm font-bold text-game-bg">
                  {t('lobby.joinRoom')}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Handmatig joinen — prominenter zodra discovery niets opleverde */}
      <div className={timedOut && rooms.length === 0 ? 'mt-6' : 'mt-auto pt-8'}>
        <label className="mb-2 block text-sm font-bold text-game-muted">
          {t('lobby.joinManual')}
        </label>
        <div className="flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 4))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doJoin(manualCode)
            }}
            maxLength={4}
            placeholder={t('lobby.enterCode')}
            className="panel flex-1 bg-transparent px-4 py-3 font-mono text-lg uppercase tracking-widest text-game-text placeholder:text-game-muted/60 focus:border-game-accent focus:outline-none"
            style={{ fontSize: 16 }}
          />
          <button
            disabled={manualCode.length < 4}
            onClick={() => doJoin(manualCode)}
            className="btn-primary px-6"
          >
            {t('lobby.joinRoom')}
          </button>
        </div>
      </div>

      <NameSheet
        open={pendingCode !== null}
        title={t('start.joinTitle')}
        initialName={playerName}
        onConfirm={(name) => {
          setPlayerName(name)
          if (pendingCode) socketActions.joinRoom(name, pendingCode)
          setPendingCode(null)
        }}
        onClose={() => setPendingCode(null)}
      />
    </div>
  )
}

// ─── Gedeelde spelerslijst ──────────────────────────────────────────────────
function PlayerList({ players }: { players: { id: string; name: string; isHost: boolean }[] }) {
  const { t } = useTranslation()
  const myPlayer = useGameStore((s) => s.myPlayer)

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-bold text-game-text">{t('lobby.players')}</h2>
        <span className="text-sm text-game-muted">
          {players.length}/{MAX_PLAYERS}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <AnimatePresence>
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="panel flex items-center gap-3 px-4 py-3"
            >
              <Avatar name={p.name} index={i} />
              <span className="font-bold text-game-text">
                {p.name}
                {myPlayer?.id === p.id && (
                  <span className="ml-1 text-game-muted">({t('lobby.you')})</span>
                )}
              </span>
              {p.isHost && (
                <span className="ml-auto rounded-pill bg-white/10 px-2 py-0.5 text-xs text-game-muted">
                  {t('lobby.host')}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
