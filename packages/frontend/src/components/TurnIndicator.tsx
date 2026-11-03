import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

/**
 * Toont wie aan de beurt is. Eigen beurt: groen met pulserende glow. Anders: muted.
 * Slide-in animatie bij elke beurtwissel (key op de huidige speler).
 */
export default function TurnIndicator() {
  const { t } = useTranslation()
  const isMyTurn = useGameStore((s) => s.isMyTurn)
  const currentPlayer = useGameStore((s) => s.currentPlayer)
  const phase = useGameStore((s) => s.gameState?.phase)

  const text = isMyTurn
    ? t('game.yourTurn')
    : t('game.waiting', { name: currentPlayer?.name ?? '' })

  const isLastTurns = phase === 'round-end'

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Tijdens 'round-end' speelt iedereen nog 1 laatste beurt — maak dat duidelijk. */}
      {isLastTurns && (
        <span className="rounded-pill bg-amber-500/20 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
          {t('game.lastTurns')}
        </span>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPlayer?.id ?? 'none'}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          className={`rounded-pill px-5 py-2 text-sm font-extrabold ${
            isMyTurn
              ? 'turn-glow bg-emerald-500/20 text-emerald-300'
              : 'bg-white/5 text-game-muted'
          }`}
          style={isMyTurn ? { border: '1px solid rgba(52,211,153,0.5)' } : undefined}
        >
          {text}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
