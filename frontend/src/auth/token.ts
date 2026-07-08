import { getToken } from './storage'

export interface TokenClaims {
  sub?: string
  role?: string
  tenant_id?: string
}

/** 从 JWT 解析角色（仅用于 UI 菜单，权限仍以 API 为准） */
export function getTokenClaims(): TokenClaims | null {
  const token = getToken()
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as TokenClaims
  } catch {
    return null
  }
}

export function getTokenRole(): string | undefined {
  return getTokenClaims()?.role
}
