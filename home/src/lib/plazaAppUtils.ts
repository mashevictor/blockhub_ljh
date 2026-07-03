import type { PlazaFeedItem } from '../data/plazaMock'
import { loadMyApps } from './myAppsStorage'

export function feedAppKey(item: PlazaFeedItem): string {
  return item.appKey || item.webUrl || item.id
}

/** 本浏览器 myApps 中有记录，或 Feed 作者为「我」→ 视为创建者 */
export function isFeedCreator(item: PlazaFeedItem): boolean {
  if (item.authorName === '我') return true
  const key = feedAppKey(item)
  return loadMyApps().some((a) => (a.appId || a.webUrl) === key)
}

export function isMyAppKey(appKey: string): boolean {
  return loadMyApps().some((a) => (a.appId || a.webUrl) === appKey)
}
