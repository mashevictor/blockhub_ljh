import type { NavigateFunction } from 'react-router-dom'
import type { PublishResult } from '../data/constants'
import { ROUTES } from '../routes/paths'
import { addMyApp } from './myAppsStorage'

export const JUST_PUBLISHED_STORAGE_KEY = 'blockhub:just-published'

export type PublishWorkPhase = 'analyze' | 'publish' | 'redirect'

/** 发布 loading 遮罩最长展示时间（含「理解需求」「生成应用」两步） */
export const PUBLISH_OVERLAY_MAX_MS = 2000
/** analyze 步自动切到 publish 的时长 */
export const PUBLISH_ANALYZE_PHASE_MS = 600

function startOverlayPhaseTimers(setPhase: (phase: PublishWorkPhase | null) => void): () => void {
  const analyzeTimer = window.setTimeout(() => setPhase('publish'), PUBLISH_ANALYZE_PHASE_MS)
  return () => {
    window.clearTimeout(analyzeTimer)
  }
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
  navigate(target, { replace: true })
  // 部分环境下 react-router navigate 可能未生效，短延迟后硬跳转兜底
  window.setTimeout(() => {
    if (window.location.pathname !== target) {
      window.location.assign(target)
    }
  }, 150)
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
  try {
    const result = await opts.execute((phase) => {
      if (phase === 'publish') opts.setPhase('publish')
    })
    clearOverlayTimers()
    opts.setPhase('redirect')
    opts.onSuccess(result)
  } catch {
    clearOverlayTimers()
    opts.setPhase(null)
    opts.setError(opts.errorMessage ?? '发布失败，请确认 API 可用并已填写联系方式')
  }
}

/** 模块/行业视图：单阶段 loading（无 analyze 步） */
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
  const maxTimer = window.setTimeout(() => opts.setLoading(false), PUBLISH_OVERLAY_MAX_MS)
  try {
    const result = await opts.execute()
    window.clearTimeout(maxTimer)
    opts.setLoading(false)
    opts.onSuccess(result)
  } catch {
    window.clearTimeout(maxTimer)
    opts.setLoading(false)
    opts.setError(opts.errorMessage ?? '发布失败，请确认 API 可用')
  }
}
