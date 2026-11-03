import type { Card } from '@skyjo/shared'

/** Som van alle zichtbare (faceUp) kaarten in een grid — de huidige rondescore. */
export function faceUpScore(grid: Card[][]): number {
  let total = 0
  for (const row of grid) {
    for (const card of row) {
      if (card?.faceUp) total += card.value
    }
  }
  return total
}

/** True als elke kaart in het grid faceUp is (speler is klaar met deze ronde). */
export function isGridComplete(grid: Card[][]): boolean {
  return grid.every((row) => row.every((card) => !card || card.faceUp))
}
