// ─── DECK ─────────────────────────────────────────────────────────────────────
export const DECK_DISTRIBUTION: Record<number, number> = {
  [-2]: 5,
  [-1]: 10,
  [0]: 15,
  [1]: 10,
  [2]: 10,
  [3]: 10,
  [4]: 10,
  [5]: 10,
  [6]: 10,
  [7]: 10,
  [8]: 10,
  [9]: 10,
  [10]: 10,
  [11]: 10,
  [12]: 10,
}

// ─── GRID ─────────────────────────────────────────────────────────────────────
export const GRID_ROWS = 3
export const GRID_COLS = 4
export const CARDS_PER_PLAYER = GRID_ROWS * GRID_COLS // 12

// ─── GAME ─────────────────────────────────────────────────────────────────────
export const MAX_SCORE = 100         // Spel eindigt als iemand dit bereikt
export const INITIAL_FLIP_COUNT = 2  // Kaarten die elke speler aan het begin omdraait
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8
