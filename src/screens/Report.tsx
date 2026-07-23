import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { buildSnapshot } from '../lib/scoring'
import { formatRange } from '../lib/week'
import { Confetti, Sheet, fadeUp } from '../components/ui'
import type { WeekSnapshot } from '../types'

function SnapshotCard({ snap, live }: { snap: WeekSnapshot; live?: boolean }) {
  const partners = useStore((s) => s.settings.partners)
  const name = (k: 'A' | 'B') => partners[k].name
  return (
    <motion.div {...fadeUp} className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <strong>{live ? '🔴 Текущая неделя' : `Неделя ${snap.weekId}`}</strong>
        <span className="faint" style={{ fontSize: 12 }}>{formatRange(snap.startTs, snap.endTs)}</span>
      </div>

      <div className="row between" style={{ gap: 10 }}>
        {(['A', 'B'] as const).map((k) => {
          const win = snap.winner === k
          return (
            <div key={k} className="grow center card" style={{ padding: 12, background: win ? 'var(--surface-2)' : undefined, borderColor: win ? 'var(--primary)' : undefined }}>
              <div className={`avatar ${k.toLowerCase()}`} style={{ margin: '0 auto 6px' }}>{name(k).slice(0, 1).toUpperCase()}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{name(k)} {win && '👑'}</div>
              <div className="mono-num" style={{ fontSize: 30, fontWeight: 800 }}>{snap.totals[k]}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {snap.trend[k] === 0 ? '—' : snap.trend[k] > 0 ? `▲ +${snap.trend[k]}` : `▼ ${snap.trend[k]}`}
              </div>
              <div className="chip" style={{ marginTop: 6, fontSize: 11, padding: '4px 8px' }}>🔥 {snap.streaks[k]}</div>
            </div>
          )
        })}
      </div>

      <div className="row between" style={{ marginTop: 14 }}>
        <span className="muted">🤝 Общая цель</span>
        <span style={{ fontWeight: 700, color: snap.teamGoalMet ? 'var(--good)' : 'var(--text-dim)' }}>
          {snap.teamTotal} / {snap.teamGoal} {snap.teamGoalMet ? '✓' : ''}
        </span>
      </div>

      {snap.mvpChore && (
        <div className="row between" style={{ marginTop: 8 }}>
          <span className="muted">⭐ MVP-дело</span>
          <span style={{ fontWeight: 700 }}>{snap.mvpChore.title} ×{snap.mvpChore.count}</span>
        </div>
      )}

      {snap.perChore.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 14 }}>Разбивка по делам</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {snap.perChore.slice(0, 6).map((p) => (
              <div key={p.title} className="row between" style={{ fontSize: 14 }}>
                <span className="muted">{p.title} ×{p.count}</span>
                <span className="mono-num">{p.points}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}

export default function Report() {
  const { log, settings, currentWeekStart, weeks, season } = useStore()
  const closeWeek = useStore((s) => s.closeWeek)
  const reopenWeek = useStore((s) => s.reopenWeek)
  const [confirm, setConfirm] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)
  const [reopen, setReopen] = useState(false)
  const [reopenStep, setReopenStep] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const live = useMemo(
    () => buildSnapshot(log, settings, currentWeekStart, weeks[0] ?? null),
    [log, settings, currentWeekStart, weeks]
  )

  // Show the most recently finished week first (by its end date).
  const sortedWeeks = useMemo(
    () => [...weeks].sort((a, b) => b.startTs - a.startTs),
    [weeks]
  )

  function openConfirm() {
    setConfirmStep(false)
    setConfirm(true)
  }

  function doClose() {
    closeWeek()
    setConfirm(false)
    setConfirmStep(false)
    setCelebrate(true)
    setTimeout(() => setCelebrate(false), 2600)
  }

  function openReopen() {
    setReopenStep(false)
    setReopen(true)
  }

  function doReopen() {
    reopenWeek()
    setReopen(false)
    setReopenStep(false)
  }

  return (
    <div className="screen">
      <Confetti show={celebrate} />
      <motion.h1 {...fadeUp} className="screen-title">Отчёты</motion.h1>

      <motion.div {...fadeUp} className="card" style={{ background: 'linear-gradient(135deg, var(--primary), #4a3fb0)' }}>
        <div className="section-label" style={{ margin: 0, color: 'rgba(255,255,255,.7)' }}>Сезонный зачёт</div>
        <div className="row between" style={{ marginTop: 10 }}>
          <div className="center grow">
            <div className="mono-num" style={{ fontSize: 34, fontWeight: 800 }}>{season.wins.A}</div>
            <div style={{ fontSize: 13 }}>{settings.partners.A.name}</div>
          </div>
          <div className="center" style={{ opacity: .8 }}>
            <div className="mono-num" style={{ fontSize: 18 }}>{season.ties}</div>
            <div style={{ fontSize: 11 }}>ничьи</div>
          </div>
          <div className="center grow">
            <div className="mono-num" style={{ fontSize: 34, fontWeight: 800 }}>{season.wins.B}</div>
            <div style={{ fontSize: 13 }}>{settings.partners.B.name}</div>
          </div>
        </div>
      </motion.div>

      <SnapshotCard snap={live} live />

      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={openConfirm} data-testid="close-week">
        🏁 Закрыть неделю
      </button>
      <p className="faint center" style={{ fontSize: 12, marginTop: 8 }}>
        В v1 это делает сервер автоматически в вс {settings.checkpointTime}
      </p>

      {weeks.length > 0 && (
        <div className="row between" style={{ marginTop: 4 }}>
          <div className="section-label" style={{ margin: 0 }}>Прошлые недели</div>
          <button className="chip" onClick={openReopen} data-testid="reopen-week">
            ↩︎ Вернуть последнюю
          </button>
        </div>
      )}
      {sortedWeeks.map((w) => <SnapshotCard key={w.weekId + w.closedAt} snap={w} />)}

      <Sheet open={confirm} onClose={() => { setConfirm(false); setConfirmStep(false) }} title="Закрыть неделю?">
        {!confirmStep ? (
          <>
            <p className="muted">
              Будет сформирован отчёт, обновится сезонный зачёт (W–L) и начнётся новая неделя с нуля. Историю отметок это не удаляет.
            </p>
            <p className="faint" style={{ fontSize: 13 }}>
              Это действие лучше делать только в конце недели. Если закрыли случайно — потом можно вернуть кнопкой «Вернуть последнюю».
            </p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => setConfirmStep(true)}>
              Далее
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setConfirm(false)}>Отмена</button>
          </>
        ) : (
          <>
            <p className="muted">
              Вы точно хотите закрыть текущую неделю и начать новую? Текущий счёт обнулится.
            </p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={doClose} data-testid="confirm-close">
              Да, закрыть неделю
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => { setConfirm(false); setConfirmStep(false) }}>Отмена</button>
          </>
        )}
      </Sheet>

      <Sheet open={reopen} onClose={() => { setReopen(false); setReopenStep(false) }} title="Вернуть последнюю неделю?">
        {!reopenStep ? (
          <>
            <p className="muted">
              Последний отчёт будет удалён, сезонный зачёт откатится, а закрытая неделя снова станет текущей. Отметки при этом сохранятся.
            </p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => setReopenStep(true)}>
              Далее
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setReopen(false)}>Отмена</button>
          </>
        ) : (
          <>
            <p className="muted">
              Вы точно хотите откатить последнее закрытие недели? Текущий отчёт и одно очко сезонного зачёта будут отменены.
            </p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={doReopen} data-testid="confirm-reopen">
              Да, вернуть неделю
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => { setReopen(false); setReopenStep(false) }}>Отмена</button>
          </>
        )}
      </Sheet>
    </div>
  )
}
