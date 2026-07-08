import { Route, Routes } from 'react-router-dom'
import HomeApp from './HomeApp'
import RedirectToAdminLogin from './components/RedirectToAdminLogin'
import PlazaLayout from './pages/plaza/PlazaLayout'
import PlazaFeedPage from './pages/plaza/PlazaFeedPage'
import PlazaMyAppsPage from './pages/plaza/PlazaMyAppsPage'
import ShanghaiVoicePage from './pages/ShanghaiVoicePage'
import { ROUTES } from './routes/paths'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectToAdminLogin />} />
      <Route path="/register" element={<RedirectToAdminLogin />} />
      <Route path="/plaza" element={<PlazaLayout />}>
        <Route index element={<PlazaFeedPage />} />
        <Route path="my" element={<PlazaMyAppsPage />} />
      </Route>
      <Route path={ROUTES.shanghaiVoice} element={<ShanghaiVoicePage />} />
      <Route path="/" element={<HomeApp />} />
    </Routes>
  )
}
