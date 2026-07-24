// Domino push relay — free Cloudflare Worker (no Blaze plan needed).
//
// The app can't send FCM messages directly (that needs a private key), and
// Cloud Functions require a paid plan. This tiny Worker holds the Firebase
// service account and forwards push requests to FCM HTTP v1. Sending through
// FCM is free on the Spark plan; only the compute moved here, and Cloudflare
// Workers are free with no card.
//
// The app POSTs { tokens, title, body, link } with an x-relay-secret header;
// the Worker mints a short-lived OAuth token from the service account and calls
// FCM for each device token.

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }))
    if (request.method !== 'POST') return cors(json({ error: 'POST only' }, 405))

    if (!env.RELAY_SECRET || request.headers.get('x-relay-secret') !== env.RELAY_SECRET) {
      return cors(json({ error: 'unauthorized' }, 401))
    }

    let payload
    try {
      payload = await request.json()
    } catch {
      return cors(json({ error: 'bad json' }, 400))
    }
    const tokens = Array.isArray(payload.tokens) ? payload.tokens.filter(Boolean) : []
    const title = String(payload.title || 'Domino')
    const body = String(payload.body || '')
    const link = String(payload.link || 'https://vlad-168.github.io/Domino/')
    if (!tokens.length) return cors(json({ sent: 0 }))

    let sa
    try {
      sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
    } catch {
      return cors(json({ error: 'service account not configured' }, 500))
    }

    const accessToken = await getAccessToken(sa)
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`
    let sent = 0
    await Promise.all(
      tokens.map(async (token) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              webpush: {
                notification: {
                  icon: 'https://vlad-168.github.io/Domino/icons/icon-192.png',
                  badge: 'https://vlad-168.github.io/Domino/icons/icon-192.png',
                },
                fcm_options: { link },
              },
            },
          }),
        })
        if (res.ok) sent++
      })
    )
    return cors(json({ sent }))
  },
}

// --- OAuth: sign a JWT with the service account key and exchange for a token ---
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const key = await importPrivateKey(sa.private_key)
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  )
  const jwt = `${unsigned}.${b64urlBytes(new Uint8Array(sig))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('no access token')
  return data.access_token
}

async function importPrivateKey(pem) {
  const body = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

function b64url(str) {
  return b64urlBytes(new TextEncoder().encode(str))
}
function b64urlBytes(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-relay-secret')
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  return res
}
