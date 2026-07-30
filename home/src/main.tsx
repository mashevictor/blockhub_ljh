import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { syncBuildVersion } from '@shared/syncBuildVersion'
import { ThemeProvider } from './context/ThemeContext'
import { HomeI18nProvider } from './i18n/HomeI18nProvider'
import { BUILD_VERSION_KEY, TOKEN_KEY } from './auth/storage'
import { applyTheme, getThemeById, loadSavedTheme } from './data/themes'
import { prefetchHeroPresets } from './lib/heroPresetsCache'
import App from './App'
import './index.css'
import './styles/chevron-dot-loader.css'

syncBuildVersion(TOKEN_KEY, BUILD_VERSION_KEY)
prefetchHeroPresets()

const initial = getThemeById(loadSavedTheme())
if (initial) applyTheme(initial)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <HomeI18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </HomeI18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
