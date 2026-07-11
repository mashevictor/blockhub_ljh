import { Navigate, useParams } from 'react-router-dom'
import { ROUTES } from '../routes/paths'

/** 短信短链 /s/:token → /share/:token */
export default function ShareShortRedirect() {
  const { token = '' } = useParams()
  if (!token) return <Navigate to="/" replace />
  return <Navigate to={ROUTES.share(token)} replace />
}
