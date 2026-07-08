import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { canAccessRole, type AppRole } from '../lib/roles'

interface Props {
  allow: AppRole[]
  children: ReactNode
}

export default function RoleGate({ allow, children }: Props) {
  const { user, role } = useAuth()

  if (!canAccessRole(user?.role ?? role, allow)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
