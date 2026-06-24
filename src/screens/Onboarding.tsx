import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'

const steps = [
  {
    emoji: '🁫',
    title: 'Domino',
    body: 'Превратите бытовые дела в игру для двоих. Баллы, соревнование и общие награды — вместе против бардака, а не друг против друга.',
  },
  {
    emoji: '📲',
    title: 'Установите на экран «Домой»',
    body: 'В Safari нажмите «Поделиться» → «На экран „Домой“». Без установки не работают пуш-уведомления о готовом недельном отчёте.',
  },
  {
    emoji: '🔔',
    title: 'Зачем устанавливать',
    body: 'Установленное приложение работает офлайн, открывается как нативное и может присылать напоминание зайти за воскресным отчётом.',
  },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const complete = useStore((s) => s.completeOnboarding)
  const isLast = step === steps.length

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {!isLast ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="center"
          >
            <div style={{ fontSize: 72, marginBottom: 18 }}>{steps[step].emoji}</div>
            <h1 style={{ fontSize: 30, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
              {steps[step].title}
            </h1>
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.5, maxWidth: 340, margin: '0 auto' }}>
              {steps[step].body}
            </p>
          </motion.div>
        ) : (
          <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="center" style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 56 }}>👫</div>
              <h1 style={{ fontSize: 26, margin: '10px 0 6px' }}>Кто играет?</h1>
              <p className="muted">Введите имена партнёров</p>
            </div>
            <div className="card">
              <div className="field">
                <label>Первый партнёр 💜</label>
                <input
                  className="input"
                  placeholder="Имя"
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  aria-label="Имя первого партнёра"
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Второй партнёр 💚</label>
                <input
                  className="input"
                  placeholder="Имя"
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  aria-label="Имя второго партнёра"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div style={{ paddingBottom: 'calc(20px + var(--safe-bottom))' }}>
        <div className="row" style={{ justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {[...steps, 'setup'].map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 22 : 7,
                height: 7,
                borderRadius: 999,
                background: i === step ? 'var(--primary)' : 'var(--border)',
                transition: 'all .2s',
              }}
            />
          ))}
        </div>
        {!isLast ? (
          <button className="btn btn-primary btn-block" onClick={() => setStep(step + 1)}>
            Далее
          </button>
        ) : (
          <button
            className="btn btn-primary btn-block"
            onClick={() => complete(nameA, nameB)}
          >
            Начать играть
          </button>
        )}
      </div>
    </div>
  )
}
