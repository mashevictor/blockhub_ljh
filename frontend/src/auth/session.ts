import { api } from '../api/client'
import { clearToken, redirectToLogin, setToken } from './storage'
import { runTencentCaptcha } from './tencentCaptcha'

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

export interface CaptchaConfig {
  enabled: boolean
  app_id: string
}

export async function fetchCaptchaConfig(): Promise<CaptchaConfig> {
  const { data } = await api.get<CaptchaConfig>('/auth/captcha-config')
  return data
}

export async function sendOtpCode(account: string): Promise<SendCodeResult> {
  let ticket: string | undefined
  let randstr: string | undefined
  try {
    const cfg = await fetchCaptchaConfig()
    if (cfg.enabled && cfg.app_id) {
      const cap = await runTencentCaptcha(cfg.app_id)
      ticket = cap.ticket
      randstr = cap.randstr
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '人机验证失败'
    throw Object.assign(new Error(msg), {
      response: { status: 400, data: { detail: msg } },
    })
  }

  const { data } = await api.post<SendCodeResult>('/auth/send-code', {
    account,
    ...(ticket && randstr ? { ticket, randstr } : {}),
  })
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
