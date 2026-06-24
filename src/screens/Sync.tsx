import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { fadeUp } from '../components/ui'
import {
  hasBuiltinConfig,
  isConfigValid,
  loadSavedConfig,
  saveConfig,
  type FirebaseConfig,
} from '../lib/firebase'
import { DEFAULT_FIREBASE_CONFIG } from '../lib/firebaseDefaults'
import { generateCode, startSync, stopSync, useSyncStatus } from '../lib/sync'

// Accepts either the JS snippet copied from the Firebase console
// (const firebaseConfig = { ... }) or plain JSON, and extracts the fields.
function parseConfig(text: string): Partial<FirebaseConfig> {
  const t = text.trim()
  try {
    const json = JSON.parse(t)
    if (json && typeof json === 'object') return json
  } catch {
    /* fall through to regex */
  }
  const pick = (k: string) => {
    const m = t.match(new RegExp(`${k}\\s*[:=]\\s*["']([^"']+)["']`))
    return m ? m[1] : undefined
  }
  return {
    apiKey: pick('apiKey'),
    authDomain: pick('authDomain'),
    projectId: pick('projectId'),
    appId: pick('appId'),
    storageBucket: pick('storageBucket'),
    messagingSenderId: pick('messagingSenderId'),
  }
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  off: { label: 'Не подключено', color: 'var(--text-dim)', dot: 'var(--text-faint)' },
  connecting: { label: 'Подключение…', color: 'var(--gold)', dot: 'var(--gold)' },
  live: { label: 'Синхронизировано', color: 'var(--good)', dot: 'var(--good)' },
  error: { label: 'Ошибка подключения', color: 'var(--warn)', dot: 'var(--warn)' },
}

export default function Sync() {
  const nav = useNavigate()
  const { status } = useSyncStatus()
  const householdCode = useStore((s) => s.householdCode)
  const setHouseholdCode = useStore((s) => s.setHouseholdCode)

  const builtin = hasBuiltinConfig()
  const saved = loadSavedConfig()
  const [configText, setConfigText] = useState(
    saved && !builtin ? JSON.stringify(saved, null, 2) : ''
  )
  const [code, setCode] = useState(householdCode ?? '')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const connected = status === 'live' || status === 'connecting'
  const meta = STATUS_META[status]

  async function connect() {
    setError(null)
    const cfg = builtin ? DEFAULT_FIREBASE_CONFIG : parseConfig(configText)
    if (!isConfigValid(cfg)) {
      setError('Не удалось распознать конфиг. Нужны поля apiKey, authDomain, projectId, appId.')
      return
    }
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length < 4) {
      setError('Код семьи должен быть не короче 4 символов.')
      return
    }
    saveConfig(cfg)
    setHouseholdCode(cleanCode)
    setCode(cleanCode)
    try {
      await startSync(cleanCode, cfg)
    } catch {
      setError('Не удалось подключиться. Проверьте конфиг и доступ к интернету.')
    }
  }

  async function disconnect() {
    await stopSync()
    setHouseholdCode(null)
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="screen">
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="chip" onClick={() => nav('/profile')}>← Назад</button>
      </div>
      <motion.h1 {...fadeUp} className="screen-title">Синхронизация устройств</motion.h1>

      <motion.div {...fadeUp} className="card row between">
        <span className="muted">Статус</span>
        <span className="row gap8" style={{ color: meta.color, fontWeight: 700 }}>
          <span style={{ width: 9, height: 9, borderRadius: 9, background: meta.dot }} />
          {meta.label}
        </span>
      </motion.div>

      {connected && householdCode ? (
        <>
          <motion.div {...fadeUp} className="card center">
            <div className="muted" style={{ fontSize: 13 }}>Код вашей семьи</div>
            <div className="mono-num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: 4, margin: '6px 0' }}>
              {householdCode}
            </div>
            <button className="btn btn-sm" onClick={copyCode}>{copied ? 'Скопировано ✓' : '📋 Скопировать код'}</button>
            <p className="faint" style={{ fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>
              Партнёр вводит <b>этот же код</b> и <b>тот же Firebase-конфиг</b> на своём телефоне — и вы видите общий счёт в реальном времени.
            </p>
          </motion.div>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 14, color: 'var(--warn)' }} onClick={disconnect}>
            Отключить синхронизацию
          </button>
        </>
      ) : (
        <>
          {builtin ? (
            <motion.div {...fadeUp} className="card row gap12">
              <span style={{ fontSize: 24 }}>☁️</span>
              <span className="faint" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Облако Domino уже подключено. Просто введите общий код семьи —
                и оба телефона начнут синхронизироваться.
              </span>
            </motion.div>
          ) : (
            <motion.div {...fadeUp} className="card">
              <div className="section-label" style={{ margin: '0 0 8px' }}>1. Firebase-конфиг</div>
              <p className="faint" style={{ fontSize: 12, marginTop: 0 }}>
                В консоли Firebase → Project settings → «Your apps» → SDK setup, скопируйте объект
                <code> firebaseConfig</code> и вставьте сюда. Оба партнёра используют один проект.
              </p>
              <textarea
                className="input"
                style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 13 }}
                placeholder={'{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "...",\n  "appId": "..."\n}'}
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                aria-label="Firebase конфиг"
              />
            </motion.div>
          )}

          <motion.div {...fadeUp} className="card">
            <div className="section-label" style={{ margin: '0 0 8px' }}>{builtin ? 'Код семьи' : '2. Код семьи'}</div>
            <p className="faint" style={{ fontSize: 12, marginTop: 0 }}>
              Придумайте общий код (или сгенерируйте). Второй партнёр вводит точно такой же.
            </p>
            <div className="row gap8">
              <input
                className="input"
                style={{ textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700 }}
                placeholder="НАПР. LOVE24"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-label="Код семьи"
              />
              <button className="btn btn-sm" onClick={() => setCode(generateCode())}>🎲</button>
            </div>
          </motion.div>

          {error && <p style={{ color: 'var(--warn)', fontSize: 13, margin: '4px 6px' }}>{error}</p>}

          <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={connect} data-testid="connect-sync">
            🔗 Подключить
          </button>
        </>
      )}

      <div className="card" style={{ marginTop: 18, background: 'transparent' }}>
        <div className="section-label" style={{ margin: '0 0 8px' }}>Как это работает</div>
        <p className="faint" style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          Данные хранятся в вашем Firebase Firestore (бесплатный тариф Spark). Облако — единственный
          источник правды: отметки, баллы, награды и недельные отчёты мгновенно прилетают на оба
          телефона через real-time листенер. Нужен один Firebase-проект на двоих и включённый
          Firestore + анонимная аутентификация.
        </p>
      </div>
    </div>
  )
}
