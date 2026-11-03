import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import LanguageToggle from '../components/LanguageToggle'
import NameSheet from '../components/NameSheet'
import { useGameStore } from '../store/gameStore'
import { socketActions } from '../socket/socketClient'

// Rainbow gradient van de echte kaart-achterkant, gebruikt voor de
// drijvende silhouetten op de achtergrond.
const CARD_BACK =
  'linear-gradient(135deg, #7c3aed 0%, #2563eb 20%, #059669 40%, #ca8a04 60%, #dc2626 80%, #7c3aed 100%)'

type FloatSpec = { left: string; w: number; h: number; rot: number; dur: number; delay: number }

const FLOATERS: FloatSpec[] = [
  { left: '8%', w: 56, h: 78, rot: -14, dur: 17, delay: 0 },
  { left: '32%', w: 44, h: 62, rot: 10, dur: 21, delay: 3 },
  { left: '62%', w: 64, h: 90, rot: -8, dur: 19, delay: 6 },
  { left: '84%', w: 40, h: 56, rot: 16, dur: 23, delay: 1.5 },
]

export default function StartScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const storedName = useGameStore((s) => s.playerName)
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const [sheet, setSheet] = useState<'create' | 'join' | null>(null)

  const handleConfirm = (name: string) => {
    setPlayerName(name)
    if (sheet === 'create') {
      // 'room-created' navigeert automatisch naar /lobby (zie useSocket).
      socketActions.createRoom(name)
    } else {
      navigate('/lobby', { state: { mode: 'join' } })
    }
    setSheet(null)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Drijvende kaart-silhouetten */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {FLOATERS.map((f, i) => (
          <div
            key={i}
            className="float-card absolute bottom-0 rounded-card"
            style={
              {
                left: f.left,
                width: f.w,
                height: f.h,
                background: CARD_BACK,
                '--rot': `${f.rot}deg`,
                '--dur': `${f.dur}s`,
                animationDelay: `${f.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Taalwissel rechtsboven */}
      <div className="absolute right-4 top-4 z-10">
        <LanguageToggle />
      </div>

      {/* Logo */}
      <motion.h1
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        className="title-glow font-display text-7xl text-white sm:text-8xl"
        style={{ letterSpacing: '0.02em' }}
      >
        SKYJO
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-3 text-center text-base text-game-muted"
      >
        {t('start.tagline')}
      </motion.p>

      {/* Knoppen */}
      <div className="z-10 mt-12 flex w-full max-w-[320px] flex-col gap-4">
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 200, damping: 18 }}
          className="btn-primary w-full"
          onClick={() => setSheet('create')}
        >
          {t('lobby.create')}
        </motion.button>

        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 18 }}
          className="btn-secondary w-full"
          onClick={() => setSheet('join')}
        >
          {t('lobby.join')}
        </motion.button>
      </div>

      <NameSheet
        open={sheet !== null}
        title={sheet === 'create' ? t('start.createTitle') : t('start.joinTitle')}
        initialName={storedName}
        onConfirm={handleConfirm}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
