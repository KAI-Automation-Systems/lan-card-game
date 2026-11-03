import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'

const MIN_LEN = 2
const MAX_LEN = 16

type NameSheetProps = {
  open: boolean
  title: string
  initialName?: string
  onConfirm: (name: string) => void
  onClose: () => void
}

/**
 * Slide-up sheet (vanuit onderkant) met backdrop blur voor naam-invoer.
 * Validatie: 2–16 tekens. Tap buiten de sheet sluit zonder actie.
 */
export default function NameSheet({
  open,
  title,
  initialName = '',
  onConfirm,
  onClose,
}: NameSheetProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      // Korte vertraging zodat de slide-in animatie eerst start.
      const id = setTimeout(() => inputRef.current?.focus(), 250)
      return () => clearTimeout(id)
    }
  }, [open, initialName])

  const trimmed = name.trim()
  const valid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN

  const submit = () => {
    if (!valid) return
    onConfirm(trimmed)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="panel relative z-10 w-full max-w-md rounded-b-none px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7"
          >
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/20" />
            <h2 className="mb-4 text-center text-xl font-extrabold text-game-text">{title}</h2>

            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              maxLength={MAX_LEN}
              placeholder={t('start.namePlaceholder')}
              className="name-input w-full"
              autoComplete="off"
              autoCapitalize="words"
            />

            <div className="mt-2 flex items-center justify-between px-1 text-xs">
              <span className="text-game-muted">
                {trimmed.length < MIN_LEN ? t('start.nameTooShort') : '\u00A0'}
              </span>
              <span className="text-game-muted">
                {trimmed.length}/{MAX_LEN}
              </span>
            </div>

            <button onClick={submit} disabled={!valid} className="btn-primary mt-4 w-full">
              {t('start.confirm')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
