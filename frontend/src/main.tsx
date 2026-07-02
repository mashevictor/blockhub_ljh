import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { applyTheme, getThemeById, loadSavedTheme } from './data/themes'
import './index.css'

const initial = getThemeById(loadSavedTheme())
if (initial) applyTheme(initial)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
