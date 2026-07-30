import type { NavigateFunction } from 'react-router-dom'
import { createI18n, formatApiErrorDetail, readStoredLocale } from '@blockhub/i18n'
import { APP_MESSAGES } from '@shared/i18n/shellBundles'
import type { PublishResult } from '../data/constants'
import { PUBLISH_ANALYZE_PHASE_MS, PUBLISH_OVERLAY_PROGRESS_MS } from '../data/publishUi'
import { ROUTES } from '../routes/paths'
import { addMyApp } from './myAppsStorage'
import { homeT } from '../i18n/homeT'

export const JUST_PUBLISHED_STORAGE_KEY = 'blockhub:just-published'

export type PublishWorkPhase = 'analyze' | 'publish' | 'redirect'

export { PUBLISH_OVERLAY_PROGRESS_MS, PUBLISH_ANALYZE_PHASE_MS }

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function startOverlayPhaseTimers(setPhase: (phase: PublishWorkPhase | null) => void): () => void {
  const analyzeTimer = window.setTimeout(() => setPhase('publish'), PUBLISH_ANALYZE_PHASE_MS)
  return () => {
    window.clearTimeout(analyzeTimer)
  }
}

function shellT(key: string, vars?: Record<string, string | number>): string {
  const i18n = createI18n({
    locale: readStoredLocale(),
    fallbackLocale: 'zh-CN',
    messages: APP_MESSAGES as Parameters<typeof createI18n>[0]['messages'],
  })
  return i18n.t(key, vars)
}

function errorMessageFromApi(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown }; status?: number } }).response
    const detail = response?.data?.detail
    const status = response?.status
    if (status === 405 || (typeof detail === 'string' && /method not allowed/i.test(detail))) {
      return homeT('home.publish.err.method_405', { fallback })
    }
    const coded = formatApiErrorDetail(detail, shellT, '')
    if (coded) return coded
    if (typeof detail === 'string' && detail.trim()) return detail
    if (status === 502) {
      return shellT('error.BAD_GATEWAY') || homeT('home.publish.err.gateway_502', { fallback })
    }
    if (status === 503) {
      return shellT('error.SERVICE_UNAVAILABLE') || homeT('home.publish.err.service_503', { fallback })
    }
  }
  if (error instanceof Error) {
    if (/timeout|ECONNABORTED/i.test(error.message)) {
      return homeT('home.publish.err.timeout', { fallback })
    }
    if (error.message) return `${fallback}：${error.message}`
  }
  return fallback
}

export interface JustPublishedHint {
  appKey: string
  saveFailed: boolean
  at: number
}

export function appStorageKey(result: Pick<PublishResult, 'appId' | 'webUrl'>): string {
  return result.appId || result.webUrl || ''
}

/** Safe HTML id for scroll targets (appKey may be a full URL). */
export function appDomId(appKey: string): string {
  return `my-app-${appKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

export function stashJustPublished(hint: JustPublishedHint): void {
  try {
    sessionStorage.setItem(JUST_PUBLISHED_STORAGE_KEY, JSON.stringify(hint))
  } catch {
    /* ignore */
  }
}

export function readJustPublished(maxAgeMs = 10 * 60 * 1000): JustPublishedHint | null {
  try {
    const raw = sessionStorage.getItem(JUST_PUBLISHED_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as JustPublishedHint
    if (!parsed.appKey || Date.now() - (parsed.at || 0) > maxAgeMs) {
      sessionStorage.removeItem(JUST_PUBLISHED_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearJustPublished(): void {
  try {
    sessionStorage.removeItem(JUST_PUBLISHED_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 保存到「我的应用」并跳转 /plaza/my */
export function finishPublishNavigate(navigate: NavigateFunction, result: PublishResult): boolean {
  const saved = addMyApp(result)
  const appKey = appStorageKey(result)
  if (appKey) {
    stashJustPublished({ appKey, saveFailed: !saved, at: Date.now() })
  } else {
    console.warn('[publishFlow] missing appId/webUrl, cannot highlight new app', result)
  }
  const target = ROUTES.plazaMyApps

  try {
    navigate(target, { replace: true })
  } catch (err) {
    console.warn('[publishFlow] navigate failed', err)
  }

  // 首页 CreateStudio 内嵌场景下 navigate 偶发不切换路由，短延迟后硬跳转兜底
  window.setTimeout(() => {
    const norm = (p: string) => {
      const x = p || '/'
      return x.length > 1 && x.endsWith('/') ? x.slice(0, -1) : x
    }
    if (norm(window.location.pathname) !== norm(target)) {
      window.location.replace(target)
    }
  }, 50)

  return saved
}

/**
 * 行业包正式发布：写入「我的应用」后直达 Runtime /r/{id}。
 * 禁止先跳 /plaza/my 再抢跳 /r/（50ms 硬跳会冲掉 80ms Runtime 跳转）。
 */
export function finishPublishNavigateToRuntime(result: PublishResult): boolean {
  const saved = addMyApp(result)
  const appKey = appStorageKey(result)
  if (appKey) {
    stashJustPublished({ appKey, saveFailed: !saved, at: Date.now() })
  } else {
    console.warn('[publishFlow] missing appId/webUrl for runtime nav', result)
  }

  let href = ''
  let appId = String(result.appId || '').trim()
  // webUrl 里抽出 /r/{id}，避免落到错误域名/IP
  if (!appId && result.webUrl) {
    const m = String(result.webUrl).match(/\/r\/([^/?#]+)/)
    if (m?.[1]) appId = decodeURIComponent(m[1])
  }
  if (appId && !appId.startsWith('cache-')) {
    href = `/r/${encodeURIComponent(appId)}`
  } else if (result.webUrl && String(result.webUrl).includes('/r/')) {
    // 仅作最后兜底；优先同源相对路径
    try {
      const u = new URL(result.webUrl, window.location.origin)
      href = `${u.pathname}${u.search}${u.hash}`
    } catch {
      href = result.webUrl
    }
  }
  if (!href) {
    console.warn('[publishFlow] no runtime href, fallback plaza')
    window.location.assign(ROUTES.plazaMyApps)
    return saved
  }
  window.location.assign(href)
  return saved
}

/**
 * 联系方式弹框「确认并生成」后的统一流水线（参考 ContractPage.handleApplyTemplate / handleSign）：
 * 1. 关弹框、清错误
 * 2. busy / phase
 * 3. 调 API
 * 4. 成功 → onSuccess（写入列表 + 跳转结果页）；失败 → 复位 busy + 错误提示
 */
export async function runContactPublishPipeline(opts: {
  closeContact: () => void
  setPhase: (phase: PublishWorkPhase | null) => void
  setError: (message: string | null) => void
  execute: (markPhase: (phase: PublishWorkPhase) => void) => Promise<PublishResult>
  onSuccess: (result: PublishResult) => void
  errorMessage?: string
}): Promise<void> {
  opts.setError(null)
  opts.setPhase('analyze')
  opts.closeContact()
  const clearOverlayTimers = startOverlayPhaseTimers(opts.setPhase)
  const progressGate = waitMs(PUBLISH_OVERLAY_PROGRESS_MS)
  try {
    const resultPromise = opts.execute((phase) => {
      if (phase === 'publish') opts.setPhase('publish')
    })
    const [result] = await Promise.all([resultPromise, progressGate])
    clearOverlayTimers()
    opts.setPhase('redirect')
    // 给浏览器一帧画到 100%，再执行跳转（避免进度条未满就卸载）
    await waitMs(280)
    opts.onSuccess(result)
  } catch (error) {
    clearOverlayTimers()
    opts.setPhase(null)
    opts.setError(errorMessageFromApi(error, opts.errorMessage ?? shellT('home.publish.error_fallback')))
  }
}

/** 模块/行业视图：单阶段 loading（无 analyze 步）——新代码请优先用 runContactPublishPipeline */
export async function runLoadingPublishPipeline(opts: {
  closeContact: () => void
  setLoading: (loading: boolean) => void
  setError: (message: string | null) => void
  execute: () => Promise<PublishResult>
  onSuccess: (result: PublishResult) => void
  errorMessage?: string
}): Promise<void> {
  opts.setError(null)
  opts.setLoading(true)
  opts.closeContact()
  const progressGate = waitMs(PUBLISH_OVERLAY_PROGRESS_MS)
  try {
    const resultPromise = opts.execute()
    const [result] = await Promise.all([resultPromise, progressGate])
    opts.setLoading(false)
    opts.onSuccess(result)
  } catch (error) {
    opts.setLoading(false)
    opts.setError(errorMessageFromApi(error, opts.errorMessage ?? shellT('home.publish.error_fallback')))
  }
}
