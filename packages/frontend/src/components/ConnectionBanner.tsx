import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'

/**
 * Subtiele banner die verschijnt zodra de socket de verbinding verliest. Verdwijnt
 * automatisch zodra er opnieuw verbinding is. Wordt alleen getoond als er al een
 * sessie liep (we hebben een socket-id gehad).
 */
export default function ConnectionBanner() {
  const { t } = useTranslation()
  const connected = useGameStore((s) => s.connected)
  const playerSocketId = useGameStore((s) => s.playerSocketId)

  const show = !connected && playerSocketId !== null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-center text-xs font-bold text-amber-950 backdrop-blur"
        >
          <span className="spin h-3 w-3 rounded-full border-2 border-amber-950/40 border-t-amber-950" />
          {t('connection.lost')}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
