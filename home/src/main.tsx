import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { syncBuildVersion } from '@shared/syncBuildVersion'
import { ThemeProvider } from './context/ThemeContext'
import { BUILD_VERSION_KEY, TOKEN_KEY } from './auth/storage'
import { applyTheme, getThemeById, loadSavedTheme } from './data/themes'
import App from './App'
import './index.css'

syncBuildVersion(TOKEN_KEY, BUILD_VERSION_KEY)

const initial = getThemeById(loadSavedTheme())
if (initial) applyTheme(initial)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
