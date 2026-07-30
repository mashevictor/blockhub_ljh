/** 腾讯云验证码（文字点选）客户端封装 */

import { homeT } from '../i18n/homeT'

const CAPTCHA_SCRIPT = 'https://turing.captcha.qcloud.com/TJCaptcha.js'

export type CaptchaTicket = { ticket: string; randstr: string }

type TencentCaptchaResult = {
  ret: number
  ticket?: string
  randstr?: string
  errorCode?: number
  errorMessage?: string
}

type TencentCaptchaCtor = new (
  appId: string,
  callback: (res: TencentCaptchaResult) => void,
  options?: Record<string, unknown>,
) => { show: () => void }

declare global {
  interface Window {
    TencentCaptcha?: TencentCaptchaCtor
  }
}

let loading: Promise<void> | null = null

function loadCaptchaScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error(homeT('home.captcha.err.no_browser')))
  if (window.TencentCaptcha) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CAPTCHA_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(homeT('home.captcha.err.script_load'))))
      if (window.TencentCaptcha) resolve()
      return
    }
    const s = document.createElement('script')
    s.src = CAPTCHA_SCRIPT
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error(homeT('home.captcha.err.script_load')))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** 弹出文字点选验证；成功返回 ticket/randstr，用户关闭则抛错 */
export async function runTencentCaptcha(appId: string): Promise<CaptchaTicket> {
  const id = String(appId || '').trim()
  if (!id) throw new Error(homeT('home.captcha.err.not_configured'))
  await loadCaptchaScript()
  const Ctor = window.TencentCaptcha
  if (!Ctor) throw new Error(homeT('home.captcha.err.unavailable'))

  return new Promise((resolve, reject) => {
    try {
      const captcha = new Ctor(
        id,
        (res) => {
          if (res.ret === 0 && res.ticket && res.randstr) {
            resolve({ ticket: res.ticket, randstr: res.randstr })
            return
          }
          if (res.ret === 2) {
            reject(new Error(homeT('home.captcha.err.cancelled')))
            return
          }
          reject(new Error(res.errorMessage || homeT('home.captcha.err.failed')))
        },
        { needFeedBack: false },
      )
      captcha.show()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(homeT('home.captcha.err.start_failed')))
    }
  })
}
