import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { entriesInRange, totalsFor } from '../lib/scoring'
import { Confetti, Sheet, fadeUp } from '../components/ui'
import type { PartnerKey } from '../types'

export default function Rewards() {
  const { rewards, log, currentWeekStart, settings } = useStore()
  const redeemReward = useStore((s) => s.redeemReward)
  const addReward = useStore((s) => s.addReward)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState(100)
  const [emoji, setEmoji] = useState('🎁')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const totals = useMemo(() => {
    const e = entriesInRange(log, currentWeekStart, currentWeekStart + 7 * 86400000)
    return totalsFor(e)
  }, [log, currentWeekStart])
  const teamPool = totals.A + totals.B

  function doRedeem(id: string, by: PartnerKey | 'team') {
    redeemReward(id, by)
    setRedeeming(null)
    setCelebrate(true)
    setTimeout(() => setCelebrate(false), 2200)
  }

  function create() {
    if (!title.trim()) return
    addReward({ title: title.trim(), cost, emoji })
    setTitle(''); setCost(100); setEmoji('🎁'); setOpen(false)
  }

  const reward = rewards.find((r) => r.id === redeeming)

  return (
    <div className="screen">
      <Confetti show={celebrate} />
      <motion.h1 {...fadeUp} className="screen-title">Награды</motion.h1>

      <motion.div {...fadeUp} className="card row between">
        <span className="muted">Командный пул недели</span>
        <strong className="mono-num" style={{ fontSize: 22 }}>{teamPool} 🪙</strong>
      </motion.div>

      <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
        {rewards.map((r) => {
          const affordable = teamPool >= r.cost && !r.redeemedBy
          return (
            <motion.div
              key={r.id}
              layout
              className="card row between"
              style={{ padding: 16, opacity: r.redeemedBy ? 0.6 : 1 }}
            >
              <div className="row gap12">
                <span style={{ fontSize: 30 }}>{r.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div className="faint" style={{ fontSize: 13 }}>{r.cost} баллов</div>
                </div>
              </div>
              {r.redeemedBy ? (
                <span className="chip active" style={{ fontSize: 12 }}>✓ Погашена</span>
              ) : (
                <button
                  className={`btn btn-sm ${affordable ? 'btn-primary' : ''}`}
                  disabled={!affordable}
                  onClick={() => setRedeeming(r.id)}
                  data-testid={`redeem-${r.id}`}
                >
                  {affordable ? 'Получить' : `Нужно ${r.cost - teamPool}`}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      <button className="fab" onClick={() => setOpen(true)} aria-label="Добавить награду">＋</button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Новая награда">
        <div className="field">
          <label>Эмодзи</label>
          <div className="row gap8" style={{ flexWrap: 'wrap' }}>
            {['🎁', '🍣', '🎬', '🛋️', '🍳', '🍫', '🥂', '🎮', '💆'].map((e) => (
              <button key={e} className={`chip ${emoji === e ? 'active' : ''}`} style={{ fontSize: 20 }} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Название</label>
          <input className="input" value={title} placeholder="Например, заказать суши" onChange={(e) => setTitle(e.target.value)} aria-label="Название награды" />
        </div>
        <div className="field">
          <label>Стоимость: <strong>{cost}</strong> баллов</label>
          <input type="range" min={20} max={400} step={10} value={cost} onChange={(e) => setCost(Number(e.target.value))} style={{ width: '100%' }} aria-label="Стоимость" />
        </div>
        <button className="btn btn-primary btn-block" onClick={create} disabled={!title.trim()} data-testid="save-reward">Добавить награду</button>
      </Sheet>

      <Sheet open={!!redeeming} onClose={() => setRedeeming(null)} title="Погасить награду">
        <p className="muted" style={{ marginTop: -4 }}>«{reward?.title}» — из какого пула списать?</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary btn-block" onClick={() => reward && doRedeem(reward.id, 'team')}>🤝 Командный пул</button>
          {(['A', 'B'] as PartnerKey[]).map((k) => (
            <button key={k} className="btn btn-block" onClick={() => reward && doRedeem(reward.id, k)}>
              {settings.partners[k].name} ({totals[k]} б.)
            </button>
          ))}
        </div>
      </Sheet>

      <AnimatePresence />
    </div>
  )
}
