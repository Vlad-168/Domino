import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { autoStartSync } from './lib/sync'
import './index.css'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

// Resume cross-device sync if this device was already paired.
// iOS can drop background connections, so we (re)connect on every launch.
void autoStartSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
)
