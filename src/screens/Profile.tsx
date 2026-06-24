import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { personalTargets } from '../lib/scoring'
import { fadeUp } from '../components/ui'

const HANDICAP_PRESETS = [
  { label: 'Поровну 50/50', a: 1, b: 1 },
  { label: '60 / 40', a: 1.5, b: 1 },
  { label: '40 / 60', a: 1, b: 1.5 },
  { label: '70 / 30', a: 2.33, b: 1 },
  { label: '30 / 70', a: 1, b: 2.33 },
]

export default function Profile() {
  const nav = useNavigate()
  const { settings } = useStore()
  const setPartnerName = useStore((s) => s.setPartnerName)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetAll = useStore((s) => s.resetAll)

  const [notifMsg, setNotifMsg] = useState<string | null>(null)
  const targets = personalTargets(settings)

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setNotifMsg('Уведомления не поддерживаются в этом браузере')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      updateSettings({ notificationsEnabled: true })
      setNotifMsg('Уведомления включены ✓')
      new Notification('Domino', { body: 'Напоминания о недельном отчёте включены 🎉' })
    } else {
      setNotifMsg('Разрешение не выдано. Включите в настройках iOS после установки PWA.')
    }
  }

  const activeHandicap = HANDICAP_PRESETS.findIndex(
    (p) => Math.abs(p.a - settings.handicap.A) < 0.01 && Math.abs(p.b - settings.handicap.B) < 0.01
  )

  return (
    <div className="screen">
      <motion.h1 {...fadeUp} className="screen-title">Профиль и настройки</motion.h1>

      <motion.div {...fadeUp} className="card">
        <div className="section-label" style={{ margin: '0 0 12px' }}>Партнёры</div>
        {(['A', 'B'] as const).map((k) => (
          <div className="field" key={k} style={{ marginBottom: k === 'A' ? 14 : 0 }}>
            <label>{k === 'A' ? '💜 Первый' : '💚 Второй'} партнёр</label>
            <input
              className="input"
              value={settings.partners[k].name}
              onChange={(e) => setPartnerName(k, e.target.value)}
              aria-label={`Имя партнёра ${k}`}
            />
          </div>
        ))}
      </motion.div>

      <motion.div {...fadeUp} className="card">
        <div className="section-label" style={{ margin: '0 0 8px' }}>Общая недельная цель</div>
        <div className="row between">
          <span className="muted">Баллов до награды</span>
          <strong className="mono-num" style={{ fontSize: 20 }}>{settings.weeklyTeamGoal}</strong>
        </div>
        <input
          type="range" min={40} max={400} step={10} value={settings.weeklyTeamGoal}
          onChange={(e) => updateSettings({ weeklyTeamGoal: Number(e.target.value) })}
          style={{ width: '100%', marginTop: 8 }}
          aria-label="Недельная цель"
        />
      </motion.div>

      <motion.div {...fadeUp} className="card">
        <div className="section-label" style={{ margin: '0 0 4px' }}>⚖️ Гандикап (справедливость)</div>
        <p className="faint" style={{ fontSize: 12, marginTop: 0 }}>
          Если у партнёра меньше свободного времени — личная цель ставится пропорционально, а не поровну.
        </p>
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {HANDICAP_PRESETS.map((p, i) => (
            <button
              key={p.label}
              className={`chip ${activeHandicap === i ? 'active' : ''}`}
              onClick={() => updateSettings({ handicap: { A: p.a, B: p.b } })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="row between" style={{ marginTop: 12, fontSize: 13 }}>
          <span className="muted">{settings.partners.A.name}: цель <strong>{targets.A}</strong></span>
          <span className="muted">{settings.partners.B.name}: цель <strong>{targets.B}</strong></span>
        </div>
      </motion.div>

      <motion.div {...fadeUp} className="card">
        <div className="section-label" style={{ margin: '0 0 8px' }}>🏁 Чекпоинт</div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Время авточекпоинта (вс)</label>
          <input
            type="time"
            className="input"
            value={settings.checkpointTime}
            onChange={(e) => updateSettings({ checkpointTime: e.target.value })}
            aria-label="Время чекпоинта"
          />
        </div>
      </motion.div>

      <motion.div {...fadeUp} className="card">
        <div className="section-label" style={{ margin: '0 0 8px' }}>🔔 Уведомления</div>
        <p className="faint" style={{ fontSize: 12, marginTop: 0 }}>
          На iOS пуши работают только после установки PWA на экран «Домой».
        </p>
        <button className="btn btn-block" onClick={enableNotifications}>
          {settings.notificationsEnabled ? 'Уведомления включены ✓' : 'Включить уведомления'}
        </button>
        {notifMsg && <p className="muted center" style={{ fontSize: 13, marginTop: 10 }}>{notifMsg}</p>}
      </motion.div>

      <motion.div {...fadeUp} className="card" style={{ display: 'grid', gap: 10 }}>
        <button className="btn btn-block" onClick={() => nav('/achievements')}>🏅 Достижения</button>
        <button className="btn btn-block" onClick={() => nav('/report')}>📊 Отчёты и сезон</button>
      </motion.div>

      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 16, color: 'var(--warn)' }}
        onClick={() => { if (confirm('Сбросить все данные и пройти онбординг заново?')) resetAll() }}
      >
        Сбросить все данные
      </button>
      <p className="faint center" style={{ fontSize: 11, marginTop: 14 }}>Domino v1.0 · сделано с 💜</p>
    </div>
  )
}
