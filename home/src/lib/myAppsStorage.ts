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
    if (!Array.isArray(parsed)) return []
    // 修复：行业缓存应用曾被误写成 /r/cache-*（服务端 404）
    let dirty = false
    const fixed = parsed.map((a) => {
      const id = String(a.appId || '')
      if (!id.startsWith('cache-')) return a
      const pack = id.split('-')[1] || 'office'
      const good =
        pack === 'mfg' || pack === 'office'
          ? `/preview/industry-runtime/${pack}`
          : `/industry/${pack}`
      const badR = a.webUrl?.includes(`/r/${id}`) || a.webUrl?.endsWith(`/r/${id}`)
      if (a.source === 'industry-cache' || badR || a.webUrl?.includes('/r/cache-')) {
        if (a.webUrl !== good) dirty = true
        return { ...a, webUrl: good, appQr: good, schemaUrl: good, source: a.source || 'industry-cache' }
      }
      return a
    })
    if (dirty) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed))
      } catch {
        /* ignore */
      }
    }
    return fixed
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

export function updateMyAppApkReady(appIdOrUrl: string, apkReady: boolean): StoredMyApp[] {
  const next = loadMyApps().map((a) => {
    const key = a.appId || a.webUrl
    if (key !== appIdOrUrl) return a
    return { ...a, apkReady }
  })
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
