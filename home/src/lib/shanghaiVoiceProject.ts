/**
 * 上海话语音 Agent — 本仓库一等公民「真项目」
 * 写入「我的应用」+ 本地广场缓存，供双轨编排 / 试运营 / APK 下载复用。
 */
import type { PublishResult, PublishedModuleItem } from '../data/constants'
import { PUBLIC_BASE_URL } from '../data/constants'
import { ROUTES } from '../routes/paths'
import { addMyApp, loadMyApps, setMyAppPlazaAudience, type StoredMyApp } from './myAppsStorage'
import {
  loadStoredPlazaPosts,
  PLAZA_FEED_UPDATED_EVENT,
  type StoredPlazaPost,
} from './plazaFeedStorage'

export const SHANGHAI_VOICE_APP_ID = 'shanghai-voice-agent'

/** 是否为上海话演示项目（全屏 B 方案 / >> 专属话术） */
export function isShanghaiVoiceApp(app?: { appId?: string; webUrl?: string; source?: string } | string | null): boolean {
  if (!app) return false
  if (typeof app === 'string') {
    return (
      app === SHANGHAI_VOICE_APP_ID
      || app.includes('shanghai-voice')
      || /上海话/.test(app)
    )
  }
  if (app.appId === SHANGHAI_VOICE_APP_ID || app.source === 'shanghai-voice-project') return true
  if (app.webUrl?.includes('shanghai-voice')) return true
  return false
}

/** 仅声明真实能力，避免广场展示「假模块」冒充业务 */
const MODULE_DEFS = [
  { key: 'shanghai_voice', label: '上海话语音', iconKey: 'mic' },
  { key: 'chat_qa', label: '智能问答', iconKey: 'chat' },
] as const

function absolutize(path: string): string {
  if (path.startsWith('http')) return path
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : PUBLIC_BASE_URL.replace(/\/$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildShanghaiVoicePublishResult(): PublishResult {
  const modules: PublishedModuleItem[] = MODULE_DEFS.map((m) => ({
    key: m.key,
    label: m.label,
    iconKey: m.iconKey,
    kind: 'module' as const,
    source: 'auto' as const,
  }))
  return {
    appId: SHANGHAI_VOICE_APP_ID,
    appName: '上海话语音助手',
    webUrl: absolutize(ROUTES.shanghaiVoice),
    appQr: absolutize('/downloads/shanghai-voice.apk'),
    downloadUrl: absolutize('/downloads/shanghai-voice.apk'),
    apkReady: true,
    primaryColor: '#E11D48',
    iconUrl: '',
    modules,
    moduleCount: modules.length,
    scenarios: modules.map((m) => m.label),
    deliver: 'both',
    source: 'shanghai-voice-project',
    contactEmail: 'shanghai-voice@blockhub.local',
  }
}

function writePlazaCache(entry: StoredPlazaPost) {
  const prev = loadStoredPlazaPosts().filter((p) => p.appKey !== entry.appKey)
  const next = [entry, ...prev].slice(0, 30)
  try {
    localStorage.setItem('blockhub_plaza_feed', JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(PLAZA_FEED_UPDATED_EVENT))
  } catch {
    /* quota */
  }
}

/** 确保出现在「我的应用」；刷新链接与模块 */
export function ensureShanghaiVoiceMyApp(): StoredMyApp {
  const next = buildShanghaiVoicePublishResult()
  addMyApp(next)
  setMyAppPlazaAudience(SHANGHAI_VOICE_APP_ID, {
    type: 'public',
    label: '@公开',
    publishedAt: new Date().toISOString(),
    onPlazaFeed: true,
  })
  const saved = loadMyApps().find((a) => a.appId === SHANGHAI_VOICE_APP_ID)
  return (
    saved ?? {
      ...next,
      savedAt: new Date().toISOString(),
      plaza: {
        type: 'public',
        label: '@公开',
        publishedAt: new Date().toISOString(),
        onPlazaFeed: true,
      },
    }
  )
}

/** 同步到本机广场 feed */
export function ensureShanghaiVoicePlazaFeed(): void {
  const app = buildShanghaiVoicePublishResult()
  const entry: StoredPlazaPost = {
    id: `project-${SHANGHAI_VOICE_APP_ID}`,
    appKey: SHANGHAI_VOICE_APP_ID,
    audienceType: 'public',
    savedAt: new Date().toISOString(),
    authorName: '积木仓',
    authorInitial: '积',
    authorMeta: '官方演示项目',
    timeLabel: '项目',
    visibility: 'public',
    atLabel: '@公开',
    appName: app.appName,
    modules: app.modules.map((m) => m.label),
    summary: `上海话实时语音智能体：开口即说、方言识别、智能问答、语音播报。含 ${app.moduleCount} 项能力，Web + APK。`,
    webUrl: app.webUrl,
    likes: 12,
    comments: 0,
    reposts: 0,
  }
  writePlazaCache(entry)
}

/** 页面/布局挂载时调用一次 */
export function bootstrapShanghaiVoiceProject(): StoredMyApp {
  const app = ensureShanghaiVoiceMyApp()
  ensureShanghaiVoicePlazaFeed()
  return app
}
