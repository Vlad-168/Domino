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
  apiKey: 'AIzaSyC5ud7rKoxht85bjjePbnGnee_HOWAGY3Q',
  authDomain: 'domino-d1892.firebaseapp.com',
  projectId: 'domino-d1892',
  appId: '1:929917593990:web:896b046ed482b33ea4e407',
  storageBucket: 'domino-d1892.firebasestorage.app',
  messagingSenderId: '929917593990',
}
