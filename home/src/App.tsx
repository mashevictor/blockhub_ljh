import { Route, Routes } from 'react-router-dom'
import HomeApp from './HomeApp'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PlazaLayout from './pages/plaza/PlazaLayout'
import PlazaFeedPage from './pages/plaza/PlazaFeedPage'
import PlazaMyAppsPage from './pages/plaza/PlazaMyAppsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/plaza" element={<PlazaLayout />}>
        <Route index element={<PlazaFeedPage />} />
        <Route path="my" element={<PlazaMyAppsPage />} />
      </Route>
      <Route path="/" element={<HomeApp />} />
    </Routes>
  )
}
