import type { AuthUser } from '../auth/session'

export type AppRole = 'admin' | 'employee' | string

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === 'admin'
}

export function canAccessRoute(user: AuthUser | null | undefined, allowed: AppRole[]): boolean {
  if (!user) return false
  return allowed.includes(user.role)
}

/** Admin-only backend modules */
export const ADMIN_ONLY_PATHS = [
  '/agents',
  '/scenarios',
  '/create',
  '/creation',
  '/reports',
  '/report',
  '/contracts',
] as const

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
