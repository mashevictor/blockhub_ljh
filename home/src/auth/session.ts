import { api } from '../api/client'
import { clearToken, redirectToLogin, setToken } from './storage'

export interface AuthUser {
  id: string
  email: string | null
  phone: string | null
  role: string
  display_name: string
  tenant_id: string
}

export interface LoginResult {
  access_token: string
  token_type: string
  user: AuthUser
}

export interface SendCodeResult {
  success: boolean
  message: string
  expires_in: number
  debug_code?: string | null
}

export async function sendOtpCode(account: string): Promise<SendCodeResult> {
  const { data } = await api.post<SendCodeResult>('/auth/send-code', { account })
  return data
}

export async function loginOtp(account: string, code: string): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>('/auth/login-otp', { account, code })
  setToken(data.access_token)
  return data
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>('/auth/login', { email, password })
  setToken(data.access_token)
  return data
}

/** @deprecated use loginWithPassword */
export async function login(email: string, password: string): Promise<LoginResult> {
  return loginWithPassword(email, password)
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me')
  return data
}

export function logout(): void {
  clearToken()
  redirectToLogin()
}
