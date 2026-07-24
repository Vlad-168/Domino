// FCM registration so the partner still gets notified when the app is fully
// closed. Each device stores its FCM token in a `pushTokens` subcollection of
// the household (kept out of the main synced doc so it isn't overwritten by
// the sync setDoc). A Cloud Function reads these tokens and pushes to the
// OTHER device whenever a chore is logged.
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore'
import { getFirebaseApp } from './firebase'
import { VAPID_KEY } from './pushConfig'
import { RELAY_URL, RELAY_SECRET } from './relayConfig'
import type { LogEntry, Settings } from '../types'

const APP_URL = 'https://vlad-168.github.io/Domino/'
const CHEERS = ['Не отставай! 💪', 'Твой ход! 🔥', 'Догоняй счёт! 🏁', 'Соревнование в разгаре! 🏆']

function pluralPoints(n: number): string {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return 'баллов'
  if (d === 1) return 'балл'
  if (d >= 2 && d <= 4) return 'балла'
  return 'баллов'
}

/**
 * Ask the free relay to push a motivational notification to the PARTNER's
 * device(s) — works even when their app is fully closed. Sent from the device
 * that logged the chore, so we push to every registered token except our own.
 */
export async function sendPartnerPush(
  db: Firestore,
  code: string,
  deviceId: string,
  entries: LogEntry[],
  settings: Settings
): Promise<void> {
  if (!RELAY_URL || !RELAY_SECRET || !entries.length) return
  try {
    const snap = await getDocs(collection(db, 'households', code, 'pushTokens'))
    const tokens = snap.docs
      .filter((d) => d.id !== deviceId)
      .map((d) => d.data().token as string)
      .filter(Boolean)
    if (!tokens.length) return

    const last = entries[entries.length - 1]
    const name = settings.partners[last.byKey]?.name ?? 'Партнёр'
    const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)]
    const title = `🔥 ${name} набирает очки!`
    const body =
      entries.length === 1
        ? `${name}: ${last.choreTitle} +${last.points} ${pluralPoints(last.points)}. ${cheer}`
        : `${name} отметил(а) ${entries.length} дел(а) подряд. ${cheer}`

    await fetch(RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-relay-secret': RELAY_SECRET },
      body: JSON.stringify({ tokens, title, body, link: APP_URL }),
    })
  } catch {
    /* best-effort */
  }
}

// Messaging SW lives on its own scope so it doesn't clash with the Workbox
// PWA service worker that controls the app.
const SW_URL = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`
const SW_SCOPE = `${import.meta.env.BASE_URL}firebase-cloud-messaging-push-scope`

/** Register this device's FCM token under the household, if push is available. */
export async function registerPushToken(db: Firestore, code: string, deviceId: string): Promise<void> {
  if (!VAPID_KEY) return // push not configured — in-app notifications only
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!('serviceWorker' in navigator)) return
  try {
    if (!(await isSupported())) return
    const app = getFirebaseApp()
    if (!app) return
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    })
    if (!token) return
    await setDoc(doc(db, 'households', code, 'pushTokens', deviceId), {
      token,
      updatedAt: Date.now(),
    })
  } catch {
    /* push is best-effort; in-app notifications still work */
  }
}
