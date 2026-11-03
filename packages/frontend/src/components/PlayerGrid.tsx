import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Card as CardType } from '@skyjo/shared'
import Card from './Card'

export type InteractionMode =
  | 'none'
  | 'flip-initial'
  | 'select-position'
  | 'flip-after-discard'

type CardSize = 'sm' | 'md' | 'lg'

type PlayerGridProps = {
  grid: CardType[][]
  isInteractive: boolean
  interactionMode: InteractionMode
  onCardClick: (row: number, col: number) => void
  size?: CardSize
}

/**
 * Bouwt de kolommen van een grid (grid[rij][kolom]) en geeft per kolom een stabiele
 * key terug. De key blijft hetzelfde zolang een kolom ≥2 kaarten deelt met de vorige
 * render (dus bij een gewone ruil), en verdwijnt zodra een kolom geëlimineerd wordt —
 * zo herkent Framer Motion exact de juiste kolom als "verwijderd" (zie fase 4 stap 6).
 */
function useColumnKeys(grid: CardType[][]): string[] {
  const prevRef = useRef<{ key: string; ids: Set<string> }[]>([])
  const counterRef = useRef(0)

  const colCount = grid[0]?.length ?? 0
  const cols: Set<string>[] = []
  for (let c = 0; c < colCount; c++) {
    const ids = new Set<string>()
    for (let r = 0; r < grid.length; r++) {
      const card = grid[r]?.[c]
      if (card) ids.add(card.id)
    }
    cols.push(ids)
  }

  const prev = prevRef.current
  const usedPrev = new Set<number>()
  const keys = cols.map((ids) => {
    let bestIdx = -1
    let bestOverlap = 0
    prev.forEach((p, idx) => {
      if (usedPrev.has(idx)) return
      let overlap = 0
      ids.forEach((id) => {
        if (p.ids.has(id)) overlap++
      })
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestIdx = idx
      }
    })
    if (bestIdx >= 0 && bestOverlap >= 2) {
      usedPrev.add(bestIdx)
      return prev[bestIdx].key
    }
    return `col_${counterRef.current++}`
  })

  prevRef.current = keys.map((key, i) => ({ key, ids: cols[i] }))
  return keys
}

export default function PlayerGrid({
  grid,
  isInteractive,
  interactionMode,
  onCardClick,
  size = 'lg',
}: PlayerGridProps) {
  const columnKeys = useColumnKeys(grid)
  const rows = grid.length
  const colCount = grid[0]?.length ?? 0
  const gap = size === 'sm' ? 'gap-1' : 'gap-1.5'

  const isCardClickable = (card: CardType | null): boolean => {
    if (!isInteractive || !card) return false
    switch (interactionMode) {
      case 'flip-initial':
        return !card.faceUp
      case 'flip-after-discard':
        return !card.faceUp
      case 'select-position':
        return true
      default:
        return false
    }
  }

  return (
    <div className={`flex justify-center ${gap}`}>
      <AnimatePresence mode="popLayout">
        {Array.from({ length: colCount }).map((_, col) => (
          <motion.div
            key={columnKeys[col]}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: [1, 1, 0],
              scale: [1, 1.06, 0],
              boxShadow: [
                '0 0 0px 0px rgba(34,197,94,0)',
                '0 0 22px 6px rgba(34,197,94,0.9)',
                '0 0 0px 0px rgba(34,197,94,0)',
              ],
            }}
            transition={{
              layout: { type: 'spring', stiffness: 380, damping: 30 },
              default: { duration: 0.7, times: [0, 0.45, 1] },
            }}
            className={`flex flex-col rounded-card ${gap}`}
          >
            {Array.from({ length: rows }).map((__, row) => {
              const card = grid[row]?.[col] ?? null
              const clickable = isCardClickable(card)
              return (
                <Card
                  key={card?.id ?? `empty-${row}-${col}`}
                  card={card}
                  size={size}
                  isInteractive={clickable}
                  onClick={clickable ? () => onCardClick(row, col) : undefined}
                />
              )
            })}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
