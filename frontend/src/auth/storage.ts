export const TOKEN_KEY = 'blockhub_token'
export const BUILD_VERSION_KEY = 'blockhub_build_version'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function loginPath(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}login`.replace(/\/{2,}/g, '/')
}

export function redirectToLogin(): void {
  const path = loginPath()
  if (!window.location.pathname.endsWith('/login')) {
    window.location.href = path
  }
}
