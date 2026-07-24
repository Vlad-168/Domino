/* Firebase Cloud Messaging background handler.
 * Runs on its own scope (/Domino/firebase-cloud-messaging-push-scope) so it
 * doesn't interfere with the Workbox PWA service worker. When a push arrives
 * with a `notification` payload the SDK displays it automatically; this file
 * only needs to initialise the app and route notification clicks. */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyC5ud7rKoxht85bjjePbnGnee_HOWAGY3Q',
  authDomain: 'domino-d1892.firebaseapp.com',
  projectId: 'domino-d1892',
  storageBucket: 'domino-d1892.firebasestorage.app',
  messagingSenderId: '929917593990',
  appId: '1:929917593990:web:896b046ed482b33ea4e407',
})

firebase.messaging()

// Focus/open the app when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.FCM_MSG?.notification?.click_action || '/Domino/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
