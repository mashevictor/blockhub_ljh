import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { fetchMe, type AuthUser } from '../auth/session'
import { canAccessRoute, type AppRole } from '../lib/roles'

interface Props {
  allow: AppRole[]
  children: ReactNode
}

export default function RoleGate({ allow, children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null
  if (!canAccessRoute(user, allow)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
