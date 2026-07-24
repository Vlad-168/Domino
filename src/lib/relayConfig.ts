// Free push relay (Cloudflare Worker) — see server/worker/.
//
// After deploying the Worker, paste its URL and the shared secret here.
// RELAY_SECRET must match the `RELAY_SECRET` you set with
// `wrangler secret put RELAY_SECRET`. Until both are filled in, push falls
// back to in-app notifications only (no delivery when the app is closed).
export const RELAY_URL = ''
export const RELAY_SECRET = ''
