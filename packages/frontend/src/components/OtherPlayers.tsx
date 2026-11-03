import { useTranslation } from 'react-i18next'
import type { Player } from '@skyjo/shared'
import { useGameStore } from '../store/gameStore'
import { isGridComplete } from '../lib/score'
import Avatar from './Avatar'
import PlayerGrid from './PlayerGrid'

/**
 * Compacte weergave van alle tegenstanders bovenaan het spelscherm. Horizontaal
 * scrollbaar zodra er meer dan 3 zijn. Highlight de speler die aan de beurt is.
 */
export default function OtherPlayers() {
  const { t } = useTranslation()
  const gameState = useGameStore((s) => s.gameState)
  const myPlayer = useGameStore((s) => s.myPlayer)

  if (!gameState) return null

  const others = gameState.players
    .map((p, index) => ({ player: p, index }))
    .filter(({ player }) => player.id !== myPlayer?.id)

  if (others.length === 0) return null

  const currentId = gameState.players[gameState.currentPlayerIndex]?.id
  const scroll = others.length > 3

  return (
    <div
      className={
        scroll
          ? 'flex gap-3 overflow-x-auto pb-1'
          : 'flex flex-wrap justify-center gap-3'
      }
    >
      {others.map(({ player, index }) => (
        <OtherPlayerCard
          key={player.id}
          player={player}
          index={index}
          isCurrent={player.id === currentId}
          readyLabel={t('game.ready')}
        />
      ))}
    </div>
  )
}

function OtherPlayerCard({
  player,
  index,
  isCurrent,
  readyLabel,
}: {
  player: Player
  index: number
  isCurrent: boolean
  readyLabel: string
}) {
  const { t } = useTranslation()
  const ready = isGridComplete(player.grid)
  const offline = !player.isConnected

  return (
    <div
      className="panel relative flex shrink-0 flex-col items-center gap-2 px-3 py-2.5 transition-all"
      style={{
        ...(isCurrent
          ? { borderColor: '#34d399', boxShadow: '0 0 16px rgba(52,211,153,0.45)' }
          : {}),
        opacity: offline ? 0.45 : 1,
      }}
    >
      <div className="flex w-full items-center gap-2">
        <Avatar name={player.name} index={index} size={26} active={isCurrent} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-game-text">{player.name}</div>
          <div className="text-[10px] text-game-muted">
            {offline ? t('game.offline') : `${player.totalScore} pt`}
          </div>
        </div>
      </div>

      <PlayerGrid
        grid={player.grid}
        isInteractive={false}
        interactionMode="none"
        onCardClick={() => {}}
        size="sm"
      />

      {ready && (
        <span className="absolute -right-1 -top-1 rounded-pill bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold text-emerald-950">
          {readyLabel}
        </span>
      )}
    </div>
  )
}
