import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'
import { socketActions } from '../socket/socketClient'
import { toast } from '../store/toastStore'
import Card from './Card'
import DrawPile from './DrawPile'
import DiscardPile from './DiscardPile'

type DrawAreaProps = {
  /** Zet het spelscherm in 'select-position' modus na "Ruilen". */
  onSwap: () => void
}

/**
 * Midden van het spelscherm: aflegstapel + trekstapel naast elkaar, plus de
 * getrokken kaart (alleen zichtbaar voor de huidige speler) met spelen/weggooien.
 */
export default function DrawArea({ onSwap }: DrawAreaProps) {
  const { t } = useTranslation()
  const gameState = useGameStore((s) => s.gameState)
  const isMyTurn = useGameStore((s) => s.isMyTurn)

  if (!gameState) return null

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1] ?? null
  const deckCount = gameState.deck.length
  const drawnCard = gameState.drawnCard
  const drawnFromDiscard = gameState.drawnFromDiscard
  const inPlay = gameState.phase === 'playing' || gameState.phase === 'round-end'
  const pilesClickable = inPlay && isMyTurn && gameState.turnStep === 'choose-source'

  const handleDiscardClick = () => socketActions.drawFromDiscard()
  const handleDeckClick = () => socketActions.drawFromDeck()
  const handleDiscardDrawn = () => {
    if (drawnFromDiscard) {
      toast.info(t('game.mustPlay'))
      return
    }
    socketActions.discardDrawnCard()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-end justify-center gap-6">
        <DiscardPile
          topCard={topDiscard}
          clickable={pilesClickable}
          onClick={handleDiscardClick}
        />
        <DrawPile count={deckCount} clickable={pilesClickable} onClick={handleDeckClick} />
      </div>

      <AnimatePresence>
        {drawnCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="flex flex-col items-center gap-3"
          >
            <Card card={{ ...drawnCard, faceUp: true }} size="lg" />
            <div className="flex gap-3">
              <button onClick={onSwap} className="btn-primary px-6 py-2 text-base">
                {t('game.swap')}
              </button>
              <button
                onClick={handleDiscardDrawn}
                disabled={drawnFromDiscard}
                title={drawnFromDiscard ? t('game.mustPlay') : undefined}
                className="btn-secondary px-6 py-2 text-base"
              >
                {t('game.discard')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
