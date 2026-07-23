export const TOKEN_KEY = 'blockhub_token'
/** 与 Runtime 同域共享时双写，避免 Admin 已登、Runtime 仍要再登 */
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

export function loginPath(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}login`.replace(/\/{2,}/g, '/')
}

export function redirectToLogin(): void {
  const path = loginPath()
  if (window.location.pathname.endsWith('/login')) return
  const ret = `${window.location.pathname}${window.location.search}`
  const sep = path.includes('?') ? '&' : '?'
  // 相对 Admin 路径（去掉 /admin 前缀）供 ProtectedRoute 风格回跳
  const from = ret.replace(/^\/admin/, '') || '/'
  window.location.href = `${path}${sep}from=${encodeURIComponent(from)}`
}
