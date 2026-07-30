/**
 * 上海话语音 — 本地演示入口预填（capability_keys: shanghai_voice + immersive_chat）。
 * 正式「选型即交付」请走 ModuleView/PromptView → publish（真实 appId + runtime）。
 * 本文件不再作为第三条交付旁路，仅用于体验预览与 >> 试运营话术识别。
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
import { homeT } from '../i18n/homeT'

export const SHANGHAI_VOICE_APP_ID = 'shanghai-voice-agent'

/** 是否为上海话演示项目（全屏 B 方案 / >> 专属话术） */
export function isShanghaiVoiceApp(app?: { appId?: string; webUrl?: string; source?: string } | string | null): boolean {
  if (!app) return false
  if (typeof app === 'string') {
    return (
      app === SHANGHAI_VOICE_APP_ID
      || app.includes('shanghai-voice')
      || /上海话|shanghainese/i.test(app)
    )
  }
  if (app.appId === SHANGHAI_VOICE_APP_ID || app.source === 'shanghai-voice-project') return true
  if (app.webUrl?.includes('shanghai-voice')) return true
  return false
}

function moduleDefs(): readonly { key: string; label: string; iconKey: string }[] {
  return [
    { key: 'shanghai_voice', label: homeT('product.mod.shanghai_voice.name'), iconKey: 'mic' },
    { key: 'chat_qa', label: homeT('product.mod.chat_qa.name'), iconKey: 'chat' },
  ] as const
}

function absolutize(path: string): string {
  if (path.startsWith('http')) return path
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : PUBLIC_BASE_URL.replace(/\/$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildShanghaiVoicePublishResult(): PublishResult {
  const modules: PublishedModuleItem[] = moduleDefs().map((m) => ({
    key: m.key,
    label: m.label,
    iconKey: m.iconKey,
    kind: 'module' as const,
    source: 'auto' as const,
  }))
  return {
    appId: SHANGHAI_VOICE_APP_ID,
    appName: homeT('home.shanghai.app_name'),
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
    webTemplateId: 'tabs_portal',
    appUiId: 'immersive_chat',
    capabilityKeys: ['shanghai_voice', 'chat_qa'],
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
  const publicLabel = homeT('home.plaza.vis.public')
  setMyAppPlazaAudience(SHANGHAI_VOICE_APP_ID, {
    type: 'public',
    label: publicLabel,
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
        label: publicLabel,
        publishedAt: new Date().toISOString(),
        onPlazaFeed: true,
      },
    }
  )
}

/** 同步到本机广场 feed */
export function ensureShanghaiVoicePlazaFeed(): void {
  const app = buildShanghaiVoicePublishResult()
  const publicLabel = homeT('home.plaza.vis.public')
  const entry: StoredPlazaPost = {
    id: `project-${SHANGHAI_VOICE_APP_ID}`,
    appKey: SHANGHAI_VOICE_APP_ID,
    audienceType: 'public',
    savedAt: new Date().toISOString(),
    authorName: homeT('home.shanghai.author_name'),
    authorInitial: homeT('home.shanghai.author_initial'),
    authorMeta: homeT('home.shanghai.author_meta'),
    timeLabel: homeT('home.shanghai.time_label'),
    visibility: 'public',
    atLabel: publicLabel,
    appName: app.appName,
    modules: app.modules.map((m) => m.label),
    summary: homeT('home.shanghai.summary', { n: app.moduleCount }),
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
