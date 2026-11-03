// 8 vaste avatar-kleuren op basis van speler-index. Gedeeld door lobby, spelscherm
// en scoreschermen zodat een speler altijd dezelfde kleur heeft.
export const AVATAR_COLORS = [
  '#818cf8',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#60a5fa',
  '#f87171',
  '#a78bfa',
  '#2dd4bf',
]

export function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

type AvatarProps = {
  name: string
  index: number
  size?: number
  active?: boolean
}

export default function Avatar({ name, index, size = 40, active = false }: AvatarProps) {
  const color = avatarColor(index)
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-game-bg"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.42,
        boxShadow: active ? `0 0 0 3px ${color}, 0 0 14px ${color}aa` : undefined,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
