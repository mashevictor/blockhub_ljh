import type { PublishResult } from '../data/constants'
import type { AudienceType } from '../data/plazaAudience'

const STORAGE_KEY = 'blockhub_my_apps'
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

export function loadMyApps(): StoredMyApp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredMyApp[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addMyApp(result: PublishResult): StoredMyApp[] {
  const entry: StoredMyApp = { ...result, savedAt: new Date().toISOString() }
  const key = result.appId || result.webUrl
  const prev = loadMyApps().filter((a) => (a.appId || a.webUrl) !== key)
  const next = [entry, ...prev].slice(0, MAX_APPS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  return next
}

export function removeMyApp(appIdOrUrl: string): StoredMyApp[] {
  const next = loadMyApps().filter((a) => a.appId !== appIdOrUrl && a.webUrl !== appIdOrUrl)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
  } catch {
    /* ignore */
  }
  return next
}
