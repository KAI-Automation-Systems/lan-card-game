import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { FinalScore } from '@skyjo/shared'
import { useGameStore } from '../store/gameStore'
import Avatar, { avatarColor } from '../components/Avatar'

export default function GameOverScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const finalScores = useGameStore((s) => s.finalScores)
  const winner = useGameStore((s) => s.winner)
  const gameState = useGameStore((s) => s.gameState)
  const reset = useGameStore((s) => s.reset)

  useEffect(() => {
    if (!finalScores) navigate('/', { replace: true })
  }, [finalScores, navigate])

  // Confetti-burst bij het laden van dit scherm.
  useEffect(() => {
    if (!finalScores) return
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.6 },
        particleCount: Math.floor(200 * particleRatio),
        spread: 70,
        startVelocity: 45,
        ...opts,
      })
    }
    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.2, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1, { spread: 120, startVelocity: 45 })
  }, [finalScores])

  if (!finalScores) return null

  const indexOf = (playerId: string) =>
    gameState?.players.findIndex((p) => p.id === playerId) ?? 0

  const sorted = [...finalScores].sort((a, b) => a.rank - b.rank)
  const usePodium = sorted.length >= 3

  const playAgain = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-12">
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="title-glow mb-2 text-center font-display text-4xl text-white"
      >
        {t('gameOver.title')}
      </motion.h1>

      {winner && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 text-center text-lg font-bold text-amber-300"
        >
          {t('gameOver.winner', { name: winner })}
        </motion.p>
      )}

      {usePodium && <Podium top3={sorted.slice(0, 3)} indexOf={indexOf} />}

      <div className="mt-6 flex flex-col gap-2.5">
        {sorted.map((s, i) => (
          <RankRow key={s.playerId} score={s} index={indexOf(s.playerId)} rank={i} />
        ))}
      </div>

      <div className="mt-auto pt-8">
        <button onClick={playAgain} className="btn-primary w-full">
          {t('gameOver.playAgain')}
        </button>
      </div>
    </div>
  )
}

function Podium({
  top3,
  indexOf,
}: {
  top3: FinalScore[]
  indexOf: (id: string) => number
}) {
  // Volgorde op het podium: 2e (links), 1e (midden), 3e (rechts).
  const order = [top3[1], top3[0], top3[2]].filter(Boolean) as FinalScore[]
  const heights: Record<number, number> = { 1: 110, 2: 80, 3: 60 }
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className="flex items-end justify-center gap-2">
      {order.map((s) => (
        <motion.div
          key={s.playerId}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 + s.rank * 0.15, type: 'spring', stiffness: 220, damping: 18 }}
          className="flex flex-1 flex-col items-center"
        >
          <Avatar name={s.playerName} index={indexOf(s.playerId)} size={s.rank === 1 ? 48 : 38} />
          <div className="mt-1 truncate text-center text-xs font-bold text-game-text">
            {s.playerName}
          </div>
          <div className="text-[11px] text-game-muted">{s.totalScore}</div>
          <div
            className="mt-1 flex w-full items-start justify-center rounded-t-xl pt-2 text-2xl"
            style={{
              height: heights[s.rank],
              background:
                s.rank === 1
                  ? 'linear-gradient(180deg, rgba(251,191,36,0.5), rgba(251,191,36,0.1))'
                  : 'rgba(255,255,255,0.06)',
              border: `1px solid ${s.rank === 1 ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {medals[s.rank]}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function RankRow({ score, index, rank }: { score: FinalScore; index: number; rank: number }) {
  const { t } = useTranslation()
  const isWinner = score.rank === 1

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + rank * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
      className="panel flex items-center gap-3 px-4 py-3"
      style={
        isWinner
          ? {
              borderColor: avatarColor(index),
              boxShadow: '0 0 22px rgba(251,191,36,0.55)',
              background: 'rgba(251,191,36,0.08)',
            }
          : undefined
      }
    >
      <span className="w-6 text-center text-sm font-extrabold text-game-muted">
        {score.rank}
      </span>
      <Avatar name={score.playerName} index={index} size={36} />
      <span className="flex-1 truncate font-bold text-game-text">
        {score.playerName}
        {isWinner && <span className="ml-1">👑</span>}
      </span>
      <span className="text-lg font-extrabold text-game-text">{score.totalScore}</span>
      <span className="sr-only">{t('gameOver.rank')}</span>
    </motion.div>
  )
}
