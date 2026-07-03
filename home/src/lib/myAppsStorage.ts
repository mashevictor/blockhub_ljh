import type { PublishResult } from '../data/constants'
import type { AudienceType } from '../data/plazaAudience'

const STORAGE_KEY = 'blockhub_my_apps'
const LEGACY_STORAGE_KEY = 'trackchat_my_apps'
export const MY_APPS_UPDATED_EVENT = 'blockhub:my-apps-updated'
const MAX_APPS = 50

export interface PlazaAudienceMeta {
  type: AudienceType
  label: string
  deptName?: string
  publishedAt: string
  onPlazaFeed: boolean
}

export interface StoredMyApp extends PublishResult {
  savedAt: string
  plaza?: PlazaAudienceMeta
}

function normalizePublishResult(result: PublishResult): PublishResult {
  return {
    ...result,
    modules: Array.isArray(result.modules) ? result.modules : [],
    moduleCount: result.moduleCount ?? (Array.isArray(result.modules) ? result.modules.length : 0),
  }
}

function migrateLegacyStorage(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy || localStorage.getItem(STORAGE_KEY)) return
    localStorage.setItem(STORAGE_KEY, legacy)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function notifyMyAppsUpdated(): void {
  window.dispatchEvent(new CustomEvent(MY_APPS_UPDATED_EVENT))
}

export function loadMyApps(): StoredMyApp[] {
  migrateLegacyStorage()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredMyApp[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @returns true when persisted to localStorage */
export function addMyApp(result: PublishResult): boolean {
  const normalized = normalizePublishResult(result)
  const entry: StoredMyApp = { ...normalized, savedAt: new Date().toISOString() }
  const key = entry.appId || entry.webUrl
  if (!key) {
    console.warn('[myApps] skip save: missing appId and webUrl', entry)
    return false
  }
  const prev = loadMyApps().filter((a) => (a.appId || a.webUrl) !== key)
  const next = [entry, ...prev].slice(0, MAX_APPS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    notifyMyAppsUpdated()
    return true
  } catch (err) {
    console.warn('[myApps] localStorage save failed', err)
    return false
  }
}

export function removeMyApp(appIdOrUrl: string): StoredMyApp[] {
  const next = loadMyApps().filter((a) => a.appId !== appIdOrUrl && a.webUrl !== appIdOrUrl)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    notifyMyAppsUpdated()
  } catch {
    /* ignore */
  }
  return next
}

export function setMyAppPlazaAudience(appKey: string, plaza: PlazaAudienceMeta): StoredMyApp[] {
  const next = loadMyApps().map((a) => {
    const key = a.appId || a.webUrl
    if (key !== appKey) return a
    return { ...a, plaza }
  })
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    notifyMyAppsUpdated()
  } catch {
    /* ignore */
  }
  return next
}
