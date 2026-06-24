import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="sheet-backdrop"
        >
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="sheet-grip" />
            {title && <h2 style={{ margin: '0 0 14px', fontSize: 21 }}>{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toast({
  message,
  actionLabel,
  onAction,
}: {
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <motion.div
      className="toast"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <span>{message}</span>
      {actionLabel && (
        <button className="undo" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}

const CONFETTI_COLORS = ['#6C5CE7', '#ff6b9d', '#2bd9c4', '#ffce54', '#8b7dff']

export function Confetti({ show }: { show: boolean }) {
  if (!show) return null
  const pieces = Array.from({ length: 60 })
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.3
        const dur = 1.6 + Math.random() * 1.2
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        return (
          <motion.i
            key={i}
            style={{ left: `${left}%`, background: color }}
            initial={{ y: -20, rotate: 0, opacity: 1 }}
            animate={{ y: '102vh', rotate: 720, opacity: [1, 1, 0] }}
            transition={{ duration: dur, delay, ease: 'easeIn' }}
          />
        )
      })}
    </div>
  )
}

export function useLockBody(locked: boolean) {
  useEffect(() => {
    if (locked) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [locked])
}

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
}
