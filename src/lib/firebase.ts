// Lazy, runtime-configurable Firebase. Config is provided by the user at
// runtime (pasted in Settings) and stored in localStorage — no rebuild and
// no build-time secrets required. Firebase web config is not sensitive (it
// identifies the project, access is governed by Security Rules).
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { DEFAULT_FIREBASE_CONFIG } from './firebaseDefaults'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  // optional
  storageBucket?: string
  messagingSenderId?: string
}

const CONFIG_KEY = 'domino-fb-config'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let authReady: Promise<void> | null = null

export function loadSavedConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw) as FirebaseConfig
  } catch {
    /* ignore */
  }
  // Fall back to a built-in shared project, if one is configured.
  return hasBuiltinConfig() ? DEFAULT_FIREBASE_CONFIG : null
}

/** True when the app ships with a built-in shared Firebase project. */
export function hasBuiltinConfig(): boolean {
  return isConfigValid(DEFAULT_FIREBASE_CONFIG)
}

export function saveConfig(cfg: FirebaseConfig | null) {
  if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  else localStorage.removeItem(CONFIG_KEY)
}

export function isConfigValid(cfg: Partial<FirebaseConfig> | null): cfg is FirebaseConfig {
  return !!(cfg && cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)
}

/** Initialise Firebase (idempotent) and sign in anonymously. */
export async function initFirebase(cfg: FirebaseConfig): Promise<Firestore> {
  if (!app) {
    app = initializeApp(cfg)
    auth = getAuth(app)
    db = getFirestore(app)
    authReady = signInAnonymously(auth).then(() => undefined)
  }
  await authReady
  return db!
}

export function getDb(): Firestore | null {
  return db
}

export function getFirebaseApp(): FirebaseApp | null {
  return app
}
