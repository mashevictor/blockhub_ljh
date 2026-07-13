import type { PublishResult } from '../data/constants'
import type { AudienceSelection } from '../data/plazaAudience'
import { audienceAtLabel } from '../data/plazaAudience'
import type { PlazaFeedItem } from '../data/plazaMock'
import { publishAppToPlaza, fetchPlazaFeed, type PlazaFeedApiItem } from '../api/client'
import type { PlazaAudienceMeta } from '../lib/myAppsStorage'
import { setMyAppPlazaAudience } from '../lib/myAppsStorage'

const STORAGE_KEY = 'blockhub_plaza_feed'
export const PLAZA_FEED_UPDATED_EVENT = 'blockhub:plaza-feed-updated'

export interface StoredPlazaPost extends PlazaFeedItem {
  appKey: string
  audienceType: AudienceSelection['type']
  savedAt: string
}

function appKey(result: Pick<PublishResult, 'appId' | 'webUrl'>) {
  return result.appId || result.webUrl
}

function formatTimeLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

function moduleLabels(result: PublishResult): string[] {
  if (result.modules.length > 0) {
    return result.modules.slice(0, 6).map((m) => m.label)
  }
  return (result.scenarios ?? []).slice(0, 6)
}

function buildSummary(result: PublishResult, sel: AudienceSelection): string {
  const mods = moduleLabels(result).join(' · ')
  const base = `${result.moduleCount} 项能力${mods ? `：${mods}` : ''}。网页和手机都能用。`
  if (sel.type === 'public') return base
  if (sel.type === 'org') return `组织内可见 · ${base}`
  if (sel.type === 'dept') return `范围可见 · ${sel.deptName ?? '部门'}内可访问 · ${base}`
  return `定向发布 · 仅指定成员可见 · ${base}`
}

function notifyPlazaFeedUpdated(): void {
  window.dispatchEvent(new CustomEvent(PLAZA_FEED_UPDATED_EVENT))
}

function apiItemToFeedItem(item: PlazaFeedApiItem): PlazaFeedItem {
  const publishedAt = item.publishedAt || new Date().toISOString()
  return {
    id: item.id,
    appKey: item.appKey,
    authorName: item.authorName,
    authorInitial: item.authorInitial,
    authorMeta: item.authorMeta,
    timeLabel: formatTimeLabel(publishedAt),
    visibility: item.visibility,
    atLabel: item.atLabel,
    appName: item.appName,
    modules: item.modules,
    summary: item.summary,
    webUrl: item.webUrl,
    likes: item.likes,
    comments: item.comments,
    reposts: item.reposts,
  }
}

export function loadStoredPlazaPosts(): StoredPlazaPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredPlazaPost[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getPlazaPostForApp(key: string): StoredPlazaPost | null {
  return loadStoredPlazaPosts().find((p) => p.appKey === key) ?? null
}

function cachePlazaPost(entry: StoredPlazaPost): void {
  const prev = loadStoredPlazaPosts().filter((p) => p.appKey !== entry.appKey)
  const next = [entry, ...prev].slice(0, 30)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
}

export async function publishToPlazaFeed(
  result: PublishResult,
  selection: AudienceSelection,
): Promise<StoredPlazaPost> {
  const key = appKey(result)
  const atLabel = audienceAtLabel(selection)
  let savedAt = new Date().toISOString()
  const vis =
    selection.type === 'public' ? 'public' : selection.type === 'org' ? 'org' : 'dept'

  let summary = buildSummary(result, selection)
  let webUrl = result.webUrl

  if (result.appId) {
    try {
      const res = await publishAppToPlaza(
        result.appId,
        selection.type,
        selection.deptName ?? '',
      )
      if (res.feed_item?.summary) summary = res.feed_item.summary
      if (res.feed_item?.webUrl) webUrl = res.feed_item.webUrl
      if (res.app?.plaza_published_at) savedAt = res.app.plaza_published_at
    } catch (err) {
      console.warn('[plaza] API publish failed, fallback to local cache', err)
    }
  }

  const entry: StoredPlazaPost = {
    id: `user-${key}`,
    appKey: key,
    audienceType: selection.type,
    savedAt,
    authorName: '我',
    authorInitial: '我',
    authorMeta: '本浏览器',
    timeLabel: '刚刚',
    visibility: vis,
    atLabel,
    appName: result.appName,
    modules: moduleLabels(result),
    summary,
    webUrl,
    likes: 0,
    comments: 0,
    reposts: 0,
  }

  cachePlazaPost(entry)

  const meta: PlazaAudienceMeta = {
    type: selection.type,
    label: atLabel,
    deptName: selection.deptName,
    publishedAt: savedAt,
    onPlazaFeed: selection.type === 'public' || selection.type === 'dept',
  }
  setMyAppPlazaAudience(key, meta)
  notifyPlazaFeedUpdated()

  return entry
}

/** 从服务端加载广场 Feed；失败时仅回退本浏览器已发布缓存（不含演示 mock） */
export async function loadPlazaFeedItemsAsync(): Promise<PlazaFeedItem[]> {
  try {
    const apiItems = await fetchPlazaFeed()
    const fromApi = apiItems
      .filter((item) => item.plaza_visibility === 'public' || item.visibility === 'public')
      .map(apiItemToFeedItem)
    if (fromApi.length > 0) return fromApi
  } catch (err) {
    console.warn('[plaza] feed API failed, using local cache', err)
  }
  return loadPlazaFeedItems()
}

/** 本浏览器已 @公开 发布的缓存（API 不可用时的兜底，不再注入 PLAZA_MOCK_FEED） */
export function loadPlazaFeedItems(): PlazaFeedItem[] {
  return loadStoredPlazaPosts()
    .filter((p) => p.audienceType === 'public')
    .map((p) => ({
      ...p,
      timeLabel: formatTimeLabel(p.savedAt),
    }))
}

export function toAudienceMeta(post: StoredPlazaPost): PlazaAudienceMeta {
  return {
    type: post.audienceType,
    label: post.atLabel,
    publishedAt: post.savedAt,
    onPlazaFeed: post.audienceType === 'public' || post.audienceType === 'dept',
  }
}
