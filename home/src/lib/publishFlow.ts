import type { NavigateFunction } from 'react-router-dom'
import type { PublishResult } from '../data/constants'
import { ROUTES } from '../routes/paths'
import { addMyApp } from './myAppsStorage'

export const JUST_PUBLISHED_STORAGE_KEY = 'blockhub:just-published'

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

/** 保存到「我的应用」并跳转 /plaza/my（所有发布入口统一调用） */
export function finishPublishNavigate(navigate: NavigateFunction, result: PublishResult): boolean {
  const saved = addMyApp(result)
  const appKey = appStorageKey(result)
  if (appKey) {
    stashJustPublished({ appKey, saveFailed: !saved, at: Date.now() })
  } else {
    console.warn('[publishFlow] missing appId/webUrl, cannot highlight new app', result)
  }
  navigate(ROUTES.plazaMyApps)
  return saved
}
