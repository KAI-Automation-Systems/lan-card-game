import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'
import { faceUpScore } from '../lib/score'

/**
 * Bovenbalk: rondelabel links, eigen (zichtbare) rondescore in het midden,
 * settings-placeholder rechts. Semi-transparant met backdrop blur.
 */
export default function TopBar() {
  const { t } = useTranslation()
  const gameState = useGameStore((s) => s.gameState)
  const myPlayer = useGameStore((s) => s.myPlayer)

  const roundNumber = gameState?.roundNumber ?? 1
  const score = myPlayer ? faceUpScore(myPlayer.grid) : 0

  return (
    <div className="flex items-center justify-between rounded-panel border border-white/10 bg-game-surface/60 px-4 py-2.5 backdrop-blur">
      <span className="text-sm font-bold text-game-text">
        {t('game.round', { number: roundNumber })}
      </span>

      <div className="flex flex-col items-center leading-none">
        <span className="text-[10px] uppercase tracking-widest text-game-muted">
          {t('game.score')}
        </span>
        <span className="text-lg font-extrabold text-game-accent">{score}</span>
      </div>

      <button
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-game-muted"
        aria-label="settings"
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  )
}
