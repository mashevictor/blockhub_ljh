import type { PublishResult } from '../data/constants'
import type { AudienceSelection } from '../data/plazaAudience'
import { audienceAtLabel } from '../data/plazaAudience'
import type { PlazaFeedItem } from '../data/plazaMock'
import { PLAZA_MOCK_FEED } from '../data/plazaMock'
import type { PlazaAudienceMeta } from '../lib/myAppsStorage'
import { setMyAppPlazaAudience } from '../lib/myAppsStorage'

const STORAGE_KEY = 'blockhub_plaza_feed'

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
  const base = `${result.moduleCount} 项能力${mods ? `：${mods}` : ''}。Web + App 双端可访问。`
  if (sel.type === 'public') return base
  if (sel.type === 'org') return `组织内可见 · ${base}`
  if (sel.type === 'dept') return `范围可见 · ${sel.deptName ?? '部门'}内可访问 · ${base}`
  return `定向发布 · 仅指定成员可见 · ${base}`
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

export function publishToPlazaFeed(
  result: PublishResult,
  selection: AudienceSelection,
): StoredPlazaPost {
  const key = appKey(result)
  const atLabel = audienceAtLabel(selection)
  const savedAt = new Date().toISOString()
  const vis =
    selection.type === 'public' ? 'public' : selection.type === 'org' ? 'org' : 'dept'

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
    summary: buildSummary(result, selection),
    webUrl: result.webUrl,
    likes: 0,
    comments: 0,
    reposts: 0,
  }

  const prev = loadStoredPlazaPosts().filter((p) => p.appKey !== key)
  const next = [entry, ...prev].slice(0, 30)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }

  const meta: PlazaAudienceMeta = {
    type: selection.type,
    label: atLabel,
    deptName: selection.deptName,
    publishedAt: savedAt,
    onPlazaFeed: selection.type === 'public' || selection.type === 'dept',
  }
  setMyAppPlazaAudience(key, meta)

  return entry
}

/** 广场 Feed：用户公开/部门帖 + Mock 演示数据 */
export function loadPlazaFeedItems(): PlazaFeedItem[] {
  const userPosts = loadStoredPlazaPosts()
    .filter((p) => p.audienceType === 'public' || p.audienceType === 'dept')
    .map((p) => ({
      ...p,
      timeLabel: formatTimeLabel(p.savedAt),
    }))
  const mockIds = new Set(userPosts.map((p) => p.id))
  const mock = PLAZA_MOCK_FEED.filter((m) => !mockIds.has(m.id))
  return [...userPosts, ...mock]
}

export function toAudienceMeta(post: StoredPlazaPost): PlazaAudienceMeta {
  return {
    type: post.audienceType,
    label: post.atLabel,
    publishedAt: post.savedAt,
    onPlazaFeed: post.audienceType === 'public' || post.audienceType === 'dept',
  }
}
