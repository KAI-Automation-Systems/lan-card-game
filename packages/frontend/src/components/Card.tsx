import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { Card as CardType } from '@skyjo/shared'

type CardSize = 'sm' | 'md' | 'lg'

type CardProps = {
  card: CardType | null
  size?: CardSize
  isInteractive?: boolean
  isSelected?: boolean
  onClick?: () => void
}

type SizeSpec = {
  w: number
  h: number
  num: number
  stroke: number
  badgeW: number
  badgeH: number
  badgeNum: number
  pad: number
  back: number
}

const SIZES: Record<CardSize, SizeSpec> = {
  sm: { w: 38, h: 54, num: 20, stroke: 2, badgeW: 18, badgeH: 12, badgeNum: 8, pad: 3, back: 9 },
  md: { w: 52, h: 72, num: 28, stroke: 2.5, badgeW: 22, badgeH: 15, badgeNum: 10, pad: 4, back: 12 },
  lg: { w: 80, h: 112, num: 44, stroke: 3, badgeW: 30, badgeH: 20, badgeNum: 14, pad: 5, back: 18 },
}

type Palette = { bg: string; glow: string; shadow: string }

function paletteFor(value: number): Palette {
  if (value <= -1) return { bg: '#5b5fc7', glow: '#818cf8', shadow: 'rgba(129,140,248,0.6)' }
  if (value === 0) return { bg: '#0ea5e9', glow: '#7dd3fc', shadow: 'rgba(125,211,252,0.6)' }
  if (value <= 5) return { bg: '#16a34a', glow: '#86efac', shadow: 'rgba(134,239,172,0.6)' }
  if (value <= 9) return { bg: '#ca8a04', glow: '#fde047', shadow: 'rgba(253,224,71,0.6)' }
  return { bg: '#dc2626', glow: '#fca5a5', shadow: 'rgba(252,165,165,0.6)' }
}

// Organische craquelé textuur via een feTurbulence SVG-filter (als data-URI achtergrond).
const CRACKLE_TEXTURE = (() => {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'>" +
    "<filter id='c'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#c)'/></svg>"
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})()

// Honingraat/hexagon textuur voor de achterkant.
const HEX_TEXTURE = (() => {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='28' viewBox='0 0 24 28'>" +
    "<path d='M12 1 L22 6.5 L22 17.5 L12 23 L2 17.5 L2 6.5 Z' fill='none' stroke='rgba(255,255,255,0.16)' stroke-width='1'/>" +
    "<path d='M12 23 L12 27 M2 17.5 L0 19 M22 17.5 L24 19' fill='none' stroke='rgba(255,255,255,0.16)' stroke-width='1'/></svg>"
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})()

const HIDDEN_FACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
}

function CardFront({ value, spec }: { value: number; spec: SizeSpec }) {
  const p = paletteFor(value)
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-card border-2 border-white"
      style={{ ...HIDDEN_FACE, background: p.bg }}
    >
      {/* Layer 2 — craquelé textuur */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: CRACKLE_TEXTURE,
          backgroundSize: 'cover',
          mixBlendMode: 'overlay',
          opacity: 0.55,
        }}
      />
      {/* Layer 3 — radiale gloed (lichter midden, donkerder randen) */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${p.glow}66 0%, transparent 70%)`,
        }}
      />
      {/* donkere vignette naar de randen */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: 'inset 0 0 12px rgba(0,0,0,0.35)' }}
      />

      {/* Layer 5 — hoek badges */}
      <Badge value={value} spec={spec} corner="tl" />
      <Badge value={value} spec={spec} corner="br" />

      {/* Layer 4 — groot centraal getal met witte outline */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          style={{
            color: 'black',
            WebkitTextStroke: `${spec.stroke}px white`,
            paintOrder: 'stroke fill',
            fontWeight: 900,
            fontSize: spec.num,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

function Badge({
  value,
  spec,
  corner,
}: {
  value: number
  spec: SizeSpec
  corner: 'tl' | 'br'
}) {
  const style: CSSProperties = {
    width: spec.badgeW,
    height: spec.badgeH,
    [corner === 'tl' ? 'top' : 'bottom']: spec.pad,
    [corner === 'tl' ? 'left' : 'right']: spec.pad,
    transform: corner === 'br' ? 'rotate(180deg)' : undefined,
  }
  return (
    <div
      className="absolute flex items-center justify-center rounded-full bg-white"
      style={style}
    >
      <span style={{ color: 'black', fontWeight: 800, fontSize: spec.badgeNum, lineHeight: 1 }}>
        {value}
      </span>
    </div>
  )
}

function CardBack({ spec }: { spec: SizeSpec }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-card border-2 border-white"
      style={{
        ...HIDDEN_FACE,
        transform: 'rotateY(180deg)',
        background:
          'linear-gradient(135deg, #7c3aed 0%, #2563eb 20%, #059669 40%, #ca8a04 60%, #dc2626 80%, #7c3aed 100%)',
      }}
    >
      {/* hexagon textuur overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: HEX_TEXTURE, backgroundSize: '12px 14px' }}
      />
      {/* SKYJO diagonaal */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display"
          style={{
            transform: 'rotate(-22deg)',
            color: 'white',
            WebkitTextStroke: `${Math.max(1, spec.stroke - 1)}px white`,
            paintOrder: 'stroke fill',
            textShadow: '1px 1px 0 rgba(0,0,0,0.4), 2px 3px 4px rgba(0,0,0,0.45)',
            fontSize: spec.back,
            letterSpacing: '0.04em',
          }}
        >
          SKYJO
        </span>
      </div>
    </div>
  )
}

export default function Card({
  card,
  size = 'md',
  isInteractive = false,
  isSelected = false,
  onClick,
}: CardProps) {
  const spec = SIZES[size]

  // Lege grid-positie (bijv. na kolom-eliminatie).
  if (!card) {
    return (
      <div
        className="rounded-card border-2 border-dashed border-white/15"
        style={{ width: spec.w, height: spec.h }}
      />
    )
  }

  const faceUp = card.faceUp
  const shadow = paletteFor(card.value).shadow

  const showPulse = isInteractive && !isSelected
  const wrapperShadow: CSSProperties = isSelected
    ? { boxShadow: `0 0 0 3px #818cf8, 0 0 18px ${shadow}` }
    : showPulse
      ? {}
      : { boxShadow: '0 4px 8px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)' }

  return (
    <motion.div
      onClick={isInteractive ? onClick : undefined}
      className={`rounded-card ${isInteractive ? 'cursor-pointer' : ''} ${showPulse ? 'card-pulse' : ''}`}
      style={{
        width: spec.w,
        height: spec.h,
        perspective: 1000,
        // GPU-compositing forceren + repaints vermijden tijdens animaties.
        willChange: 'transform',
        transform: 'translateZ(0)',
        touchAction: 'manipulation',
        ...wrapperShadow,
      }}
      animate={{ scale: isSelected ? 1.06 : 1 }}
      whileHover={isInteractive ? { scale: 1.08 } : undefined}
      whileTap={isInteractive ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <CardFront value={card.value} spec={spec} />
        <CardBack spec={spec} />
      </motion.div>
    </motion.div>
  )
}

export { paletteFor }
