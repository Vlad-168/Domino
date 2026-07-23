// Real-time cross-device sync over Firestore.
//
// Both partners enter the SAME Firebase config + the SAME household code.
// The shared household state lives in households/{code}. Each device
// subscribes with onSnapshot (live) and pushes local changes (debounced).
//
// Merge strategy (converges for two low-concurrency devices):
//  - log:        union by id minus tombstones (no logged chore is ever lost)
//  - chores/rewards/achievements/weeks: union by id, conflicts prefer remote
//  - settings/season/currentWeekStart:  last-write-wins from remote
import {
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { create } from 'zustand'
import { useStore } from '../store'
import { initFirebase, loadSavedConfig, type FirebaseConfig } from './firebase'
import { notifyChoreLogged } from './notify'
import type {
  Achievement,
  Chore,
  LogEntry,
  Reward,
  Settings,
  WeekSnapshot,
} from '../types'

export interface SharedState {
  settings: Settings
  chores: Chore[]
  log: LogEntry[]
  rewards: Reward[]
  achievements: Achievement[]
  weeks: WeekSnapshot[]
  season: { wins: { A: number; B: number }; ties: number }
  currentWeekStart: number
  deletedLogIds: string[]
  writerId: string
  updatedAt: number
}

export type SyncStatus = 'off' | 'connecting' | 'live' | 'error'

/** Reactive sync status for the UI. */
export const useSyncStatus = create<{ status: SyncStatus }>(() => ({ status: 'off' }))

// Stable per-device id so a device can ignore the echo of its own writes.
const DEVICE_KEY = 'domino-device-id'
function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

let unsubDoc: Unsubscribe | null = null
let unsubStore: (() => void) | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let applyingRemote = false
let activeCode: string | null = null
// The first snapshot after (re)connecting is a full backfill, not live news —
// don't notify for it, only for entries that arrive while we're connected.
let primed = false
let statusCb: ((s: SyncStatus) => void) | null = null

function setStatus(s: SyncStatus) {
  useSyncStatus.setState({ status: s })
  statusCb?.(s)
}

/** Resume sync on app start if the user previously paired this device. */
export async function autoStartSync(): Promise<void> {
  const config = loadSavedConfig()
  const code = useStore.getState().householdCode
  if (config && code) {
    try {
      await startSync(code, config)
    } catch {
      setStatus('error')
    }
  }
}

function unionBy<T>(local: T[], remote: T[], key: (x: T) => string): T[] {
  const map = new Map<string, T>()
  for (const x of local) map.set(key(x), x)
  for (const x of remote) map.set(key(x), x) // remote wins on conflict
  return [...map.values()]
}
const byId = <T extends { id: string }>(local: T[], remote: T[]) =>
  unionBy(local, remote, (x) => x.id)

function extractShared(): SharedState {
  const s = useStore.getState()
  return {
    settings: s.settings,
    chores: s.chores,
    log: s.log,
    rewards: s.rewards,
    achievements: s.achievements,
    weeks: s.weeks,
    season: s.season,
    currentWeekStart: s.currentWeekStart,
    deletedLogIds: s.deletedLogIds,
    writerId: deviceId(),
    updatedAt: Date.now(),
  }
}

// Fire motivational notifications for chores the partner logged since our
// last view. Skips the priming snapshot and any stale backfilled entries.
function notifyIncoming(local: SharedState['log'], remote: SharedState) {
  if (!primed) return
  const known = new Set(local.map((e) => e.id))
  const tomb = new Set(remote.deletedLogIds ?? [])
  const now = Date.now()
  for (const e of remote.log) {
    if (known.has(e.id) || tomb.has(e.id)) continue
    if (now - e.ts > 5 * 60 * 1000) continue // ignore historical entries
    void notifyChoreLogged(e, remote.settings)
  }
}

function mergeRemote(remote: SharedState) {
  const local = useStore.getState()
  notifyIncoming(local.log, remote)
  const deletedLogIds = Array.from(
    new Set([...(local.deletedLogIds ?? []), ...(remote.deletedLogIds ?? [])])
  )
  const tomb = new Set(deletedLogIds)
  const log = byId(local.log, remote.log)
    .filter((e) => !tomb.has(e.id))
    .sort((a, b) => b.ts - a.ts)

  applyingRemote = true
  useStore.setState({
    settings: remote.settings,
    chores: byId(local.chores, remote.chores),
    rewards: byId(local.rewards, remote.rewards),
    achievements: byId(local.achievements, remote.achievements),
    weeks: unionBy(local.weeks, remote.weeks, (w) => w.weekId),
    season: remote.season,
    currentWeekStart: remote.currentWeekStart,
    log,
    deletedLogIds,
  })
  applyingRemote = false
}

function schedulePush(db: Firestore, code: string) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    const shared = extractShared()
    setDoc(doc(db, 'households', code), shared).catch(() => {
      setStatus('error')
    })
  }, 700)
}

export async function startSync(
  code: string,
  config: FirebaseConfig,
  onStatus?: (s: SyncStatus) => void
): Promise<void> {
  await stopSync()
  statusCb = onStatus ?? null
  activeCode = code
  primed = false
  setStatus('connecting')

  const db = await initFirebase(config)
  const ref = doc(db, 'households', code)

  // Live subscription: apply remote changes (ignoring our own echo).
  unsubDoc = onSnapshot(
    ref,
    (snap) => {
      setStatus('live')
      if (!snap.exists()) {
        // First device to join — seed the cloud with our state.
        setDoc(ref, extractShared()).catch(() => setStatus('error'))
        return
      }
      const data = snap.data() as SharedState
      if (data.writerId === deviceId() && snap.metadata.hasPendingWrites) return
      mergeRemote(data)
      // After the first applied remote snapshot we're "live": later arrivals
      // are genuine partner activity and should raise notifications.
      primed = true
    },
    () => setStatus('error')
  )

  // Push local mutations (debounced), skipping changes we applied from remote.
  unsubStore = useStore.subscribe(() => {
    if (applyingRemote || !activeCode) return
    schedulePush(db, activeCode)
  })
}

export async function stopSync(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  unsubDoc?.()
  unsubStore?.()
  unsubDoc = null
  unsubStore = null
  activeCode = null
  primed = false
  setStatus('off')
}

/** Generate a friendly, easy-to-share household code. */
export function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}
