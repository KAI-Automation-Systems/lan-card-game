import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { RoundScore } from '@skyjo/shared'
import { useGameStore } from '../store/gameStore'
import { socketActions } from '../socket/socketClient'
import Avatar from '../components/Avatar'

/** Telt vanaf 0 naar `value` in ~1 seconde. */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>()

  useEffect(() => {
    const duration = 1000
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [value])

  return <span>{display}</span>
}

export default function RoundEndScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scores = useGameStore((s) => s.lastRoundScores)
  const gameState = useGameStore((s) => s.gameState)
  const isHost = useGameStore((s) => s.isHost)

  useEffect(() => {
    if (!scores) navigate('/', { replace: true })
  }, [scores, navigate])

  if (!scores) return null

  const indexOf = (playerId: string) =>
    gameState?.players.findIndex((p) => p.id === playerId) ?? 0

  const sorted = [...scores].sort((a, b) => a.roundScore - b.roundScore)
  const lowest = sorted.length ? sorted[0].roundScore : 0
  const roundNumber = gameState?.roundNumber ?? 1

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-10">
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="mb-6 text-center font-display text-3xl text-white"
      >
        {t('roundEnd.title', { number: roundNumber })}
      </motion.h1>

      <div className="flex flex-col gap-2.5">
        {sorted.map((s, i) => (
          <ScoreRow
            key={s.playerId}
            score={s}
            index={indexOf(s.playerId)}
            rank={i}
            isLowest={s.roundScore === lowest}
          />
        ))}
      </div>

      <div className="mt-auto pt-8">
        {isHost ? (
          <button onClick={() => socketActions.nextRound()} className="btn-primary w-full">
            {t('roundEnd.next')}
          </button>
        ) : (
          <p className="text-center text-sm text-game-muted">{t('roundEnd.waitingHost')}</p>
        )}
      </div>
    </div>
  )
}

function ScoreRow({
  score,
  index,
  rank,
  isLowest,
}: {
  score: RoundScore
  index: number
  rank: number
  isLowest: boolean
}) {
  const { t } = useTranslation()
  const roundColor = score.penaltyApplied
    ? 'text-red-400'
    : score.roundScore < 0
      ? 'text-emerald-400'
      : 'text-game-text'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
      className="panel flex items-center gap-3 px-4 py-3"
      style={
        isLowest
          ? { borderColor: '#fbbf24', boxShadow: '0 0 16px rgba(251,191,36,0.4)' }
          : undefined
      }
    >
      <Avatar name={score.playerName} index={index} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-bold text-game-text">
          <span className="truncate">{score.playerName}</span>
          {isLowest && <span aria-hidden>👑</span>}
        </div>
        <div className="text-xs text-game-muted">
          {t('roundEnd.total')}: {score.totalScore}
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span className={`text-2xl font-extrabold ${roundColor}`}>
          {score.roundScore > 0 ? '+' : ''}
          <CountUp value={score.roundScore} />
        </span>
        {score.penaltyApplied && (
          <span className="rounded-pill bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
            {t('roundEnd.penalty')}
          </span>
        )}
      </div>
    </motion.div>
  )
}
