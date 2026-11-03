import type { Config } from 'tailwindcss'

// Design tokens gebaseerd op de échte Skyjo kaarten — zie SPEC.md sectie 7.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Fredoka One', 'cursive'],
      },
      colors: {
        card: {
          negative: '#5b5fc7', // -2, -1 blauw/paars
          'negative-glow': '#818cf8',
          zero: '#0ea5e9', // 0 lichtblauw
          'zero-glow': '#7dd3fc',
          low: '#16a34a', // 1-5 groen
          'low-glow': '#86efac',
          mid: '#ca8a04', // 6-9 geel/goud
          'mid-glow': '#fde047',
          high: '#dc2626', // 10-12 rood
          'high-glow': '#fca5a5',
        },
        game: {
          bg: '#0f0c29', // Diepe donkere tafel achtergrond
          surface: '#1a1650',
          felt: '#162032', // Speeltafel groen/blauw gevoel
          accent: '#818cf8',
          text: '#e0e7ff',
          muted: '#94a3b8',
        },
      },
      boxShadow: {
        card: '0 4px 8px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 20px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)',
        'card-glow-negative': '0 0 12px rgba(129,140,248,0.6)',
        'card-glow-zero': '0 0 12px rgba(125,211,252,0.6)',
        'card-glow-low': '0 0 12px rgba(134,239,172,0.6)',
        'card-glow-mid': '0 0 12px rgba(253,224,71,0.6)',
        'card-glow-high': '0 0 12px rgba(252,165,165,0.6)',
        glow: '0 0 24px rgba(129,140,248,0.5)',
      },
      borderRadius: {
        card: '10px',
        panel: '20px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
}

export default config
