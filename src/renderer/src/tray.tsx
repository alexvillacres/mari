import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TrayWindow from './TrayWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrayWindow />
  </StrictMode>
)

