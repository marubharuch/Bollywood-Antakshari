import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // App shell cached; game data remains in localStorage + IndexedDB.
    },
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
