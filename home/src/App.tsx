import { Route, Routes } from 'react-router-dom'
import HomeApp from './HomeApp'
import LoginPage from './pages/LoginPage'
import PlazaPage from './pages/PlazaPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage />} />
      <Route path="/plaza" element={<PlazaPage />} />
      <Route path="/*" element={<HomeApp />} />
    </Routes>
  )
}
