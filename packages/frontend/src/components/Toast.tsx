import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useToastStore, type ToastType } from '../store/toastStore'

const STYLES: Record<ToastType, { bg: string; border: string }> = {
  error: { bg: 'rgba(220,38,38,0.92)', border: '#fca5a5' },
  success: { bg: 'rgba(22,163,74,0.92)', border: '#86efac' },
  info: { bg: 'rgba(37,99,235,0.92)', border: '#93c5fd' },
}

/**
 * Globale toast-container. Toasts verschijnen bovenaan, gestapeld, en verdwijnen
 * automatisch na 3 seconden (geregeld door de toast-store).
 */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLES[t.type]
          const style: CSSProperties = {
            background: s.bg,
            border: `1px solid ${s.border}`,
            backdropFilter: 'blur(8px)',
          }
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => dismiss(t.id)}
              className="pointer-events-auto w-full max-w-sm cursor-pointer rounded-pill px-5 py-3 text-center text-sm font-bold text-white shadow-lg"
              style={style}
            >
              {t.message}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
