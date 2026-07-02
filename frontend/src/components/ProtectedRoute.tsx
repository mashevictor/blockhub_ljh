import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getToken } from '../auth/storage'

export default function ProtectedRoute() {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
