import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import type { Category, Chore, Frequency } from '../types'
import { Sheet, fadeUp } from '../components/ui'

const CATS: { key: Category; label: string; emoji: string }[] = [
  { key: 'kitchen', label: 'Кухня', emoji: '🍳' },
  { key: 'cleaning', label: 'Уборка', emoji: '🧹' },
  { key: 'shopping', label: 'Закупки', emoji: '🛒' },
  { key: 'other', label: 'Прочее', emoji: '📦' },
]
const catEmoji = (c: Category) => CATS.find((x) => x.key === c)!.emoji

type Draft = {
  title: string
  points: number
  category: Category
  frequency: Frequency
  multiplier: boolean
}

const emptyDraft: Draft = { title: '', points: 3, category: 'cleaning', frequency: 'repeat', multiplier: false }

export default function Chores() {
  const chores = useStore((s) => s.chores)
  const addChore = useStore((s) => s.addChore)
  const updateChore = useStore((s) => s.updateChore)
  const archiveChore = useStore((s) => s.archiveChore)

  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<Chore | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [open, setOpen] = useState(false)

  const active = chores.filter((c) => !c.archived)
  const archived = chores.filter((c) => c.archived)

  function openNew() {
    setEditing(null)
    setDraft(emptyDraft)
    setOpen(true)
  }
  function openEdit(c: Chore) {
    setEditing(c)
    setDraft({ title: c.title, points: c.points, category: c.category, frequency: c.frequency, multiplier: c.multiplier })
    setOpen(true)
  }
  function save() {
    if (!draft.title.trim()) return
    if (editing) updateChore(editing.id, draft)
    else addChore(draft)
    setOpen(false)
  }

  function ChoreCard({ c }: { c: Chore }) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card row between"
        style={{ padding: 14 }}
      >
        <button className="row gap12 grow" style={{ textAlign: 'left' }} onClick={() => openEdit(c)} data-testid={`edit-${c.id}`}>
          <span style={{ fontSize: 24 }}>{catEmoji(c.category)}</span>
          <span>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div className="faint" style={{ fontSize: 12 }}>
              {c.frequency === 'repeat' ? 'повторяемое' : 'разовое'}
              {c.multiplier && ' · ×2'}
            </div>
          </span>
        </button>
        <div className="row gap8">
          <span className="badge-points">{c.points * (c.multiplier ? 2 : 1)}</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => archiveChore(c.id, !c.archived)}
            data-testid={`archive-${c.id}`}
            aria-label={c.archived ? 'Вернуть' : 'В архив'}
          >
            {c.archived ? '↩️' : '🗄️'}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="screen">
      <motion.h1 {...fadeUp} className="screen-title">Каталог дел</motion.h1>

      <div style={{ display: 'grid', gap: 12 }}>
        <AnimatePresence>
          {active.map((c) => <ChoreCard key={c.id} c={c} />)}
        </AnimatePresence>
        {active.length === 0 && (
          <div className="empty"><span className="emoji">📋</span>Пока нет дел. Добавьте первое!</div>
        )}
      </div>

      {archived.length > 0 && (
        <>
          <button className="section-label" style={{ background: 'none' }} onClick={() => setShowArchived((v) => !v)}>
            Архив ({archived.length}) {showArchived ? '▲' : '▼'}
          </button>
          <AnimatePresence>
            {showArchived && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gap: 12, opacity: 0.7 }}>
                {archived.map((c) => <ChoreCard key={c.id} c={c} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <button className="fab" onClick={openNew} data-testid="add-chore" aria-label="Добавить дело">＋</button>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Редактировать дело' : 'Новое дело'}>
        <div className="field">
          <label>Название</label>
          <input
            className="input"
            value={draft.title}
            placeholder="Например, помыть посуду"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            aria-label="Название дела"
          />
        </div>

        <div className="field">
          <label>Баллы за усилие / неприятность: <strong>{draft.points}</strong></label>
          <input
            type="range" min={1} max={10} value={draft.points}
            onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
            style={{ width: '100%' }}
            aria-label="Баллы"
          />
        </div>

        <div className="field">
          <label>Категория</label>
          <div className="row gap8" style={{ flexWrap: 'wrap' }}>
            {CATS.map((cat) => (
              <button
                key={cat.key}
                className={`chip ${draft.category === cat.key ? 'active' : ''}`}
                onClick={() => setDraft({ ...draft, category: cat.key })}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Частота</label>
          <div className="row gap8">
            {(['repeat', 'once'] as Frequency[]).map((f) => (
              <button
                key={f}
                className={`chip ${draft.frequency === f ? 'active' : ''}`}
                onClick={() => setDraft({ ...draft, frequency: f })}
              >
                {f === 'repeat' ? '🔁 Повторяемое' : '1️⃣ Разовое'}
              </button>
            ))}
          </div>
        </div>

        <button
          className={`btn btn-block ${draft.multiplier ? 'btn-primary' : ''}`}
          style={{ marginBottom: 16, justifyContent: 'space-between' }}
          onClick={() => setDraft({ ...draft, multiplier: !draft.multiplier })}
        >
          <span>😖 «Никто не хочет это делать» ×2</span>
          <span>{draft.multiplier ? '✓' : ''}</span>
        </button>

        <button className="btn btn-primary btn-block" onClick={save} disabled={!draft.title.trim()} data-testid="save-chore">
          {editing ? 'Сохранить' : 'Добавить дело'}
        </button>
        {editing && (
          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 10, color: 'var(--warn)' }}
            onClick={() => { archiveChore(editing.id, true); setOpen(false) }}
          >
            🗄️ В архив
          </button>
        )}
      </Sheet>
    </div>
  )
}
