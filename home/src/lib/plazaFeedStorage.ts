import type { PublishResult } from '../data/constants'
import type { AudienceSelection } from '../data/plazaAudience'
import { audienceAtLabel } from '../data/plazaAudience'
import type { PlazaFeedItem } from '../data/plazaMock'
import { publishAppToPlaza, fetchPlazaFeed, type PlazaFeedApiItem } from '../api/client'
import type { PlazaAudienceMeta } from '../lib/myAppsStorage'
import { setMyAppPlazaAudience } from '../lib/myAppsStorage'
import { readStoredLocale } from '@blockhub/i18n'
import { homeT } from '../i18n/homeT'

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
  if (diff < 60_000) return homeT('home.plaza.feed.time.just_now')
  if (diff < 3600_000) return homeT('home.plaza.feed.time.minutes', { n: Math.floor(diff / 60_000) })
  if (diff < 86400_000) return homeT('home.plaza.feed.time.hours', { n: Math.floor(diff / 3600_000) })
  const locale = readStoredLocale() === 'en-US' ? 'en-US' : 'zh-CN'
  return new Date(iso).toLocaleDateString(locale)
}

function moduleLabels(result: PublishResult): string[] {
  if (result.modules.length > 0) {
    return result.modules.slice(0, 6).map((m) => m.label)
  }
  return (result.scenarios ?? []).slice(0, 6)
}

function buildSummary(result: PublishResult, sel: AudienceSelection): string {
  const mods = moduleLabels(result).join(' · ')
  const modsPart = mods ? homeT('home.plaza.feed.summary.mods_sep', { mods }) : ''
  const base = homeT('home.plaza.feed.summary.base', { n: result.moduleCount, mods: modsPart })
  if (sel.type === 'public') return base
  if (sel.type === 'org') return homeT('home.plaza.feed.summary.org', { base })
  if (sel.type === 'dept') {
    return homeT('home.plaza.feed.summary.dept', {
      dept: sel.deptName ?? homeT('home.plaza.feed.summary.dept_fallback'),
      base,
    })
  }
  return homeT('home.plaza.feed.summary.targeted', { base })
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
      // 有正式 appId 时禁止「假成功」：广场看不到却显示已发布
      throw err instanceof Error ? err : new Error(homeT('home.plaza.feed.publish_fail'))
    }
  }

  const entry: StoredPlazaPost = {
    id: `user-${key}`,
    appKey: key,
    audienceType: selection.type,
    savedAt,
    authorName: homeT('home.plaza.feed.me'),
    authorInitial: homeT('home.plaza.feed.me'),
    authorMeta: homeT('home.plaza.feed.browser_meta'),
    timeLabel: homeT('home.plaza.feed.time.just_now'),
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

/** 从服务端加载广场 Feed；与本机公开帖合并（按 appKey 去重，API 优先） */
export async function loadPlazaFeedItemsAsync(): Promise<PlazaFeedItem[]> {
  const local = loadPlazaFeedItems()
  try {
    const apiItems = await fetchPlazaFeed()
    const fromApi = apiItems
      .filter((item) => item.plaza_visibility === 'public' || item.visibility === 'public')
      .map(apiItemToFeedItem)
    const byKey = new Map<string, PlazaFeedItem>()
    for (const item of fromApi) {
      byKey.set(String(item.appKey || item.id), item)
    }
    for (const item of local) {
      const k = String(item.appKey || item.id)
      if (!byKey.has(k)) byKey.set(k, item)
    }
    const merged = Array.from(byKey.values())
    return merged.length > 0 ? merged : local
  } catch (err) {
    console.warn('[plaza] feed API failed, using local cache', err)
  }
  return local
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
