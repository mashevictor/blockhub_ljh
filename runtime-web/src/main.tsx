import { createRoot } from 'react-dom/client'
import { RuntimeI18nProvider } from './i18n/RuntimeI18nProvider'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <RuntimeI18nProvider>
    <App />
  </RuntimeI18nProvider>,
)
