import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { fadeUp } from '../components/ui'
import { sameDay } from '../lib/week'

export default function Log() {
  const log = useStore((s) => s.log)
  const partners = useStore((s) => s.settings.partners)
  const undoEntry = useStore((s) => s.undoEntry)

  const groups = useMemo(() => {
    const out: { label: string; items: typeof log }[] = []
    const now = Date.now()
    for (const e of log) {
      const label = sameDay(e.ts, now)
        ? 'Сегодня'
        : sameDay(e.ts, now - 86400000)
        ? 'Вчера'
        : new Date(e.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      let g = out.find((x) => x.label === label)
      if (!g) { g = { label, items: [] }; out.push(g) }
      g.items.push(e)
    }
    return out
  }, [log])

  return (
    <div className="screen">
      <motion.h1 {...fadeUp} className="screen-title">История</motion.h1>

      {log.length === 0 && (
        <div className="empty"><span className="emoji">🕑</span>Пока нет отметок. Отметьте первое дело на главной!</div>
      )}

      {groups.map((g) => (
        <div key={g.label}>
          <div className="section-label">{g.label}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <AnimatePresence>
              {g.items.map((e) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  className="card row between"
                  style={{ padding: 12 }}
                >
                  <div className="row gap12">
                    <span className={`avatar ${e.byKey.toLowerCase()}`}>
                      {partners[e.byKey].name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{e.choreTitle}</div>
                      <div className="faint" style={{ fontSize: 12 }}>
                        {partners[e.byKey].name} ·{' '}
                        {new Date(e.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="row gap8">
                    <span className="badge-points">+{e.points}</span>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => undoEntry(e.id)}
                      aria-label="Отменить запись"
                      data-testid={`undo-${e.id}`}
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  )
}
