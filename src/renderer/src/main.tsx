import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import TrayWindow from './TrayWindow'

// Check if this is the tray window (via query parameter)
const urlParams = new URLSearchParams(window.location.search)
const isTrayWindow = urlParams.get('tray') === 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isTrayWindow ? <TrayWindow /> : <App />}</StrictMode>
)
