import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'

const LANGS = ['nl', 'de'] as const
type Lang = (typeof LANGS)[number]

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = (i18n.language as Lang) ?? 'nl'

  const setLang = (lng: Lang) => {
    void i18n.changeLanguage(lng)
    useGameStore.setState({ language: lng })
  }

  return (
    <div className="flex items-center gap-1 rounded-pill border border-white/15 bg-white/5 p-1 backdrop-blur">
      {LANGS.map((lng) => {
        const active = current.startsWith(lng)
        return (
          <button
            key={lng}
            onClick={() => setLang(lng)}
            className={`rounded-pill px-3 py-1 text-sm font-bold uppercase transition-all ${
              active ? 'bg-game-accent text-game-bg' : 'text-game-muted hover:text-game-text'
            }`}
          >
            {lng}
          </button>
        )
      })}
    </div>
  )
}
