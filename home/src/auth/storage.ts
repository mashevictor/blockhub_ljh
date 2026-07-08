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

import { getAdminUrl } from '../data/constants'

export function redirectToLogin(): void {
  const target = getAdminUrl()
  if (!window.location.href.startsWith(target.split('?')[0])) {
    window.location.href = target
  }
}
