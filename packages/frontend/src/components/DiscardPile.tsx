import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Card as CardType } from '@skyjo/shared'
import Card from './Card'

type DiscardPileProps = {
  topCard: CardType | null
  clickable: boolean
  onClick: () => void
}

/** Aflegstapel — toont de bovenste kaart face-up. Klikbaar om ervan te trekken. */
export default function DiscardPile({ topCard, clickable, onClick }: DiscardPileProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        type="button"
        onClick={clickable ? onClick : undefined}
        disabled={!clickable}
        className={`relative rounded-card ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
        style={clickable ? { boxShadow: '0 0 18px rgba(129,140,248,0.6)' } : undefined}
        animate={clickable ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={clickable ? { duration: 1.6, repeat: Infinity } : undefined}
        whileHover={clickable ? { scale: 1.08 } : undefined}
        whileTap={clickable ? { scale: 0.95 } : undefined}
      >
        {topCard ? (
          <Card card={{ ...topCard, faceUp: true }} size="lg" />
        ) : (
          <div className="rounded-card border-2 border-dashed border-white/15" style={{ width: 80, height: 112 }} />
        )}
      </motion.button>
      <span className="text-[10px] uppercase tracking-wider text-game-muted">
        {t('game.drawDiscard')}
      </span>
    </div>
  )
}
