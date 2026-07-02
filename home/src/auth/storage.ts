export const TOKEN_KEY = 'blockhub_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function redirectToLogin(): void {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}
