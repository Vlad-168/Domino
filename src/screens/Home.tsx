import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { entriesInRange, personalTargets, streakFor, totalsFor, winnerOf } from '../lib/scoring'
import { formatRange } from '../lib/week'
import QuickLog from '../components/QuickLog'
import { Confetti, Toast, fadeUp } from '../components/ui'
import type { PartnerKey } from '../types'

export default function Home() {
  const nav = useNavigate()
  const { log, settings, currentWeekStart } = useStore()
  const undoEntry = useStore((s) => s.undoEntry)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState<{ entryId: string; title: string } | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const weekEnd = currentWeekStart + 7 * 86400000
  const entries = useMemo(
    () => entriesInRange(log, currentWeekStart, weekEnd),
    [log, currentWeekStart, weekEnd]
  )
  const totals = totalsFor(entries)
  const team = totals.A + totals.B
  const goal = settings.weeklyTeamGoal
  const targets = personalTargets(settings)
  const leader = winnerOf(totals, settings)
  const pct = Math.min(100, Math.round((team / goal) * 100))

  function partnerCol(k: PartnerKey) {
    const p = settings.partners[k]
    const streak = streakFor(entries, k)
    const isLeader = leader === k && team > 0
    const target = targets[k]
    const tpct = Math.min(100, Math.round((totals[k] / (target || 1)) * 100))
    return (
      <div className="grow center" style={{ position: 'relative' }}>
        {isLeader && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 22 }}
          >
            👑
          </motion.div>
        )}
        <div className={`avatar ${k.toLowerCase()}`} style={{ width: 56, height: 56, fontSize: 22, margin: '0 auto 8px' }}>
          {p.name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
        <motion.div
          key={totals[k]}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="mono-num"
          style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}
        >
          {totals[k]}
        </motion.div>
        <div className="faint" style={{ fontSize: 12 }}>цель {target}</div>
        <div className="progress" style={{ height: 6, marginTop: 8 }}>
          <motion.span
            animate={{ width: `${tpct}%` }}
            style={{ background: k === 'A' ? 'var(--a)' : 'var(--b)' }}
          />
        </div>
        <div className="chip" style={{ marginTop: 10, fontSize: 12, padding: '5px 10px' }}>
          🔥 {streak} {streak === 1 ? 'день' : 'дней'}
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <Confetti show={celebrate} />
      <motion.div {...fadeUp}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <h1 className="screen-title" style={{ margin: 0 }}>Эта неделя</h1>
          <button className="chip" onClick={() => nav('/report')}>
            📊 Отчёты
          </button>
        </div>
        <p className="screen-sub" style={{ marginTop: 6 }}>{formatRange(currentWeekStart, weekEnd)}</p>
      </motion.div>

      <motion.div {...fadeUp} className="card">
        <div className="row" style={{ alignItems: 'flex-start', gap: 8, paddingTop: 6 }}>
          {partnerCol('A')}
          <div className="faint" style={{ fontSize: 13, fontWeight: 700, alignSelf: 'center', paddingTop: 24 }}>VS</div>
          {partnerCol('B')}
        </div>
      </motion.div>

      <motion.div {...fadeUp} className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <strong>🤝 Общая цель</strong>
          <span className="muted mono-num">{team} / {goal}</span>
        </div>
        <div className="progress">
          <motion.span animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
        {team >= goal ? (
          <p className="center" style={{ color: 'var(--good)', fontWeight: 700, margin: '12px 0 0' }}>
            🎉 Цель достигнута! Награда разблокирована
          </p>
        ) : (
          <p className="muted center" style={{ margin: '12px 0 0', fontSize: 13 }}>
            Ещё {goal - team} баллов до совместной награды
          </p>
        )}
      </motion.div>

      <motion.button
        {...fadeUp}
        whileTap={{ scale: 0.97 }}
        className="btn btn-primary btn-block"
        style={{ marginTop: 16, padding: 18, fontSize: 17 }}
        onClick={() => setSheetOpen(true)}
        data-testid="home-add"
      >
        ➕ Отметить выполненное дело
      </motion.button>

      <QuickLog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onLogged={(info) => {
          setToast(info)
          setCelebrate(true)
          setTimeout(() => setCelebrate(false), 2200)
          setTimeout(() => setToast(null), 4000)
        }}
      />

      <AnimatePresence>
        {toast && (
          <Toast
            message={`«${toast.title}» засчитано`}
            actionLabel="Отменить"
            onAction={() => {
              undoEntry(toast.entryId)
              setToast(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
