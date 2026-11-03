import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Card from './Card'

type DrawPileProps = {
  count: number
  clickable: boolean
  onClick: () => void
}

/** Trekstapel (face-down) met een badge dat het aantal resterende kaarten toont. */
export default function DrawPile({ count, clickable, onClick }: DrawPileProps) {
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
        <Card card={{ id: 'deck-back', value: 0, faceUp: false }} size="lg" />
        <span className="absolute -bottom-1.5 -right-1.5 min-w-[22px] rounded-pill bg-game-bg px-1.5 py-0.5 text-center text-[11px] font-extrabold text-game-text shadow">
          {count}
        </span>
      </motion.button>
      <span className="text-[10px] uppercase tracking-wider text-game-muted">
        {t('game.drawDeck')}
      </span>
    </div>
  )
}
