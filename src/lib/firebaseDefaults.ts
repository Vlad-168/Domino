import type { FirebaseConfig } from './firebase'

// Built-in shared Firebase project for Domino.
//
// When this is filled in, the whole app works "out of the box": partners
// only enter a shared household code — no config pasting. The Firebase web
// API key is NOT a secret (it merely identifies the project; access is
// governed by Firestore Security Rules), so it is safe to commit here.
//
// Leave the fields empty to keep the app in "bring your own Firebase" mode
// (the Sync screen will then ask for the config too).
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
  storageBucket: '',
  messagingSenderId: '',
}
