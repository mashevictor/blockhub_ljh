import { api } from '../api/client'
import { clearToken, redirectToLogin, setToken } from './storage'

export interface AuthUser {
  id: string
  email: string
  role: string
  display_name: string
  tenant_id: string
}

export interface LoginResult {
  access_token: string
  token_type: string
  user: AuthUser
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>('/auth/login', { email, password })
  setToken(data.access_token)
  return data
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me')
  return data
}

export function logout(): void {
  clearToken()
  redirectToLogin()
}
