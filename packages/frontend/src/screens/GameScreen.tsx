import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { socketActions } from '../socket/socketClient'
import { toast } from '../store/toastStore'
import TopBar from '../components/TopBar'
import OtherPlayers from '../components/OtherPlayers'
import TurnIndicator from '../components/TurnIndicator'
import DrawArea from '../components/DrawArea'
import PlayerGrid, { type InteractionMode } from '../components/PlayerGrid'

export default function GameScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const gameState = useGameStore((s) => s.gameState)
  const myPlayer = useGameStore((s) => s.myPlayer)
  const isMyTurn = useGameStore((s) => s.isMyTurn)

  // UI-only state: na "Ruilen" kiest de speler een gridpositie.
  const [selectingPosition, setSelectingPosition] = useState(false)

  const phase = gameState?.phase
  const turnStep = gameState?.turnStep
  const drawnCard = gameState?.drawnCard ?? null

  // Reset de selectie zodra de getrokken kaart weg is of het niet meer mijn beurt is.
  useEffect(() => {
    if (!drawnCard || !isMyTurn) setSelectingPosition(false)
  }, [drawnCard, isMyTurn])

  // Geen state (directe navigatie / na reset) → terug naar start.
  useEffect(() => {
    if (!gameState) navigate('/', { replace: true })
  }, [gameState, navigate])

  const interactionMode: InteractionMode = useMemo(() => {
    if (!myPlayer) return 'none'
    // Initial flip is simultaan (SPEC 11.9) — elke speler draait zelf 2 kaarten om,
    // los van de beurtvolgorde. Dus NIET achter isMyTurn gaten.
    if (phase === 'initial-flip') {
      return myPlayer.initialFlipsRemaining > 0 ? 'flip-initial' : 'none'
    }
    if (!isMyTurn) return 'none'
    if (selectingPosition && drawnCard) return 'select-position'
    if (turnStep === 'flip-after-discard') return 'flip-after-discard'
    return 'none'
  }, [isMyTurn, myPlayer, phase, turnStep, selectingPosition, drawnCard])

  if (!gameState || !myPlayer) return null

  const handleCardClick = (row: number, col: number) => {
    switch (interactionMode) {
      case 'flip-initial':
        socketActions.flipInitial(row, col)
        break
      case 'select-position':
        socketActions.placeDrawnCard(row, col)
        setSelectingPosition(false)
        break
      case 'flip-after-discard':
        socketActions.flipCard(row, col)
        break
      default:
        break
    }
  }

  const showInitialOverlay =
    phase === 'initial-flip' && myPlayer.initialFlipsRemaining > 0

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-3 pb-4 pt-3">
      <TopBar />

      <div className="min-h-0 flex-shrink">
        <OtherPlayers />
      </div>

      {/* Tijdens initial-flip is er geen beurtvolgorde — verberg de beurtindicator. */}
      {phase !== 'initial-flip' && <TurnIndicator />}

      <DrawArea onSwap={() => setSelectingPosition(true)} />

      {/* Eigen grid, groot, onderaan */}
      <div
        className="mt-auto pt-2"
        onClickCapture={() => {
          // Geen "niet jouw beurt" tijdens de simultane initial-flip fase.
          if (phase !== 'initial-flip' && !isMyTurn) toast.error(t('game.notYourTurn'))
        }}
      >
        <PlayerGrid
          grid={myPlayer.grid}
          isInteractive={interactionMode !== 'none'}
          interactionMode={interactionMode}
          onCardClick={handleCardClick}
          size="lg"
        />
      </div>

      {/* Initial-flip overlay */}
      <AnimatePresence>
        {showInitialOverlay && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-[max(3.5rem,env(safe-area-inset-top))]"
          >
            <div className="panel px-6 py-3 text-center">
              <div className="font-extrabold text-game-text">{t('game.flipTwo')}</div>
              <div className="mt-0.5 text-sm text-game-accent">
                {t('game.flipRemaining', { count: myPlayer.initialFlipsRemaining })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
