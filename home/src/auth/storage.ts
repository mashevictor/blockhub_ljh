import { adminLoginUrlWithReturn } from '../data/brand'

export const TOKEN_KEY = 'blockhub_token'
export const RUNTIME_TOKEN_KEY = 'blockhub_runtime_token'
export const RUNTIME_USER_KEY = 'blockhub_runtime_user'
export const BUILD_VERSION_KEY = 'blockhub_build_version'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(RUNTIME_TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(RUNTIME_TOKEN_KEY, token)
}

/** 与 Runtime 共享登录态：token + user 一并写入 */
export function setSharedAuth(
  token: string,
  user: { email?: string | null; role: string; display_name: string },
): void {
  setToken(token)
  localStorage.setItem(
    RUNTIME_USER_KEY,
    JSON.stringify({
      email: user.email || '',
      role: user.role,
      display_name: user.display_name,
    }),
  )
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(RUNTIME_TOKEN_KEY)
  localStorage.removeItem(RUNTIME_USER_KEY)
}

export function redirectToLogin(): void {
  const returnTo = `${window.location.pathname}${window.location.search}`
  const target = adminLoginUrlWithReturn(returnTo)
  if (!window.location.href.startsWith(target.split('?')[0])) {
    window.location.href = target
  }
}
