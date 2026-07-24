// FCM registration so the partner still gets notified when the app is fully
// closed. Each device stores its FCM token in a `pushTokens` subcollection of
// the household (kept out of the main synced doc so it isn't overwritten by
// the sync setDoc). A Cloud Function reads these tokens and pushes to the
// OTHER device whenever a chore is logged.
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { doc, setDoc, type Firestore } from 'firebase/firestore'
import { getFirebaseApp } from './firebase'
import { VAPID_KEY } from './pushConfig'

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
