/** 腾讯云验证码（文字点选）客户端封装 */

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
  if (typeof window === 'undefined') return Promise.reject(new Error('非浏览器环境'))
  if (window.TencentCaptcha) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CAPTCHA_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('人机验证脚本加载失败')))
      if (window.TencentCaptcha) resolve()
      return
    }
    const s = document.createElement('script')
    s.src = CAPTCHA_SCRIPT
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('人机验证脚本加载失败'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** 弹出文字点选验证；成功返回 ticket/randstr，用户关闭则抛错 */
export async function runTencentCaptcha(appId: string): Promise<CaptchaTicket> {
  const id = String(appId || '').trim()
  if (!id) throw new Error('人机验证未配置')
  await loadCaptchaScript()
  const Ctor = window.TencentCaptcha
  if (!Ctor) throw new Error('人机验证组件不可用')

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
            reject(new Error('已取消人机验证'))
            return
          }
          reject(new Error(res.errorMessage || '人机验证未通过'))
        },
        { needFeedBack: false },
      )
      captcha.show()
    } catch (e) {
      reject(e instanceof Error ? e : new Error('人机验证启动失败'))
    }
  })
}
