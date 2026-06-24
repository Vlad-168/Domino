import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import type { PartnerKey } from '../types'
import { Sheet } from './ui'

const CATEGORY_EMOJI: Record<string, string> = {
  kitchen: '🍳',
  cleaning: '🧹',
  shopping: '🛒',
  other: '📦',
}

export default function QuickLog({
  open,
  onClose,
  onLogged,
}: {
  open: boolean
  onClose: () => void
  onLogged: (info: { entryId: string; title: string }) => void
}) {
  const chores = useStore((s) => s.chores.filter((c) => !c.archived))
  const partners = useStore((s) => s.settings.partners)
  const logChore = useStore((s) => s.logChore)
  const log = useStore((s) => s.log)

  const [choreId, setChoreId] = useState<string | null>(null)

  const selected = chores.find((c) => c.id === choreId)

  function pick(key: PartnerKey) {
    if (!choreId || !selected) return
    logChore(choreId, key)
    // newest entry is at the front
    const entryId = useStore.getState().log[0]?.id ?? log[0]?.id
    onLogged({ entryId, title: selected.title })
    setChoreId(null)
    onClose()
  }

  return (
    <Sheet open={open} onClose={() => { setChoreId(null); onClose() }} title="Отметить дело">
      {!choreId ? (
        <div>
          <p className="muted" style={{ marginTop: -4 }}>Шаг 1 из 2 — выберите дело</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {chores.length === 0 && (
              <div className="empty">Сначала добавьте дела в каталоге</div>
            )}
            {chores.map((c) => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.97 }}
                className="card row between"
                style={{ padding: 14, textAlign: 'left' }}
                onClick={() => setChoreId(c.id)}
                data-testid={`pick-chore-${c.id}`}
              >
                <span className="row gap12">
                  <span style={{ fontSize: 24 }}>{CATEGORY_EMOJI[c.category]}</span>
                  <span>
                    <div style={{ fontWeight: 700 }}>{c.title}</div>
                    {c.multiplier && <div className="faint" style={{ fontSize: 12 }}>×2 никто не хочет</div>}
                  </span>
                </span>
                <span className="badge-points">
                  {c.points * (c.multiplier ? 2 : 1)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="muted" style={{ marginTop: -4 }}>Шаг 2 из 2 — кто сделал «{selected?.title}»?</p>
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {(['A', 'B'] as PartnerKey[]).map((k) => (
              <motion.button
                key={k}
                whileTap={{ scale: 0.96 }}
                className="btn btn-block"
                style={{ padding: 18, justifyContent: 'flex-start', gap: 14 }}
                onClick={() => pick(k)}
                data-testid={`log-by-${k}`}
              >
                <span className={`avatar ${k.toLowerCase()}`}>
                  {partners[k].name.slice(0, 1).toUpperCase()}
                </span>
                <span style={{ fontSize: 17 }}>{partners[k].name}</span>
                <span className="badge-points grow" style={{ marginLeft: 'auto', flex: 'none' }}>
                  +{(selected?.points ?? 0) * (selected?.multiplier ? 2 : 1)}
                </span>
              </motion.button>
            ))}
          </div>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => setChoreId(null)}>
            ← Назад к делам
          </button>
        </div>
      )}
    </Sheet>
  )
}
