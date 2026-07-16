/**
 * 行业包场景 / 生成应用 — 前端静态缓存（零网络）。
 * 与 backend industry_packs_all + industryRuntimeScenes 对齐；生成不打 /creation/publish。
 */

import type { PublishResult, PublishedModuleItem } from './constants'
import { SCENES } from './constants'
import { MODULE_ICON_KEYS } from './iconPalette'
import {
  getIndustryRuntimePreview,
  type IndustryRuntimeScene,
} from './industryRuntimeScenes'
import { INDUSTRIES_SHOWCASE } from './showcase'
import { buildClientStaticEnrichment } from './industryEnrichStatic'

export interface CachedIndustryScene {
  id: string
  name: string
  category: string
  capabilityKey: string
  summary?: string
}

const PACK_LABEL: Record<string, string> = Object.fromEntries(
  INDUSTRIES_SHOWCASE.map((i) => [i.key, i.name]),
)

function iconFor(key: string): string {
  return MODULE_ICON_KEYS[key] ?? 'creation'
}

function fromRuntimeScenes(scenes: IndustryRuntimeScene[]): CachedIndustryScene[] {
  return scenes.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    capabilityKey: s.capabilityHint.split(/\s*\+\s*/)[0].trim() || 'chat_qa',
    summary: s.summary,
  }))
}

/** 同步取行业场景清单（不请求 API） */
export function getCachedIndustryScenes(packKey: string): CachedIndustryScene[] {
  const preview = getIndustryRuntimePreview(packKey)
  if (preview?.scenes?.length) return fromRuntimeScenes(preview.scenes)

  const names = SCENES[packKey]
  if (names?.length) {
    const enrich = buildClientStaticEnrichment(packKey)
    const prefer = enrich.recommended_modules
    return names.map((name, i) => ({
      id: `${packKey}-s${i}`,
      name,
      category: PACK_LABEL[packKey] ?? packKey,
      capabilityKey: prefer[i % Math.max(prefer.length, 1)] || 'chat_qa',
    }))
  }

  const meta = INDUSTRIES_SHOWCASE.find((i) => i.key === packKey)
  if (!meta) return []
  const enrich = buildClientStaticEnrichment(packKey)
  const prefer = enrich.recommended_modules.length
    ? enrich.recommended_modules
    : ['chat_qa', 'approval_flow', 'kb_document']
  return Array.from({ length: Math.min(meta.count, 12) }, (_, i) => ({
    id: `${packKey}-fb-${i}`,
    name: `${meta.name}场景 ${i + 1}`,
    category: meta.name,
    capabilityKey: prefer[i % prefer.length]!,
  }))
}

export function industryRuntimeWebUrl(packKey: string): string {
  if (getIndustryRuntimePreview(packKey)) {
    return `/preview/industry-runtime/${packKey}`
  }
  return `/industry/${packKey}`
}

function shortHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  return Math.abs(h).toString(36).slice(0, 8)
}

/** 按勾选场景本地装配「生成应用」结果（即时，无网络） */
export function buildCachedIndustryPublish(opts: {
  packKey: string
  appName: string
  scenes: CachedIndustryScene[]
  selectedIds: Set<string> | string[]
  iconUrl?: string
  primaryColor?: string
  webTemplateId?: string
  appUiId?: string
  contactEmail?: string
  contactPhone?: string
}): PublishResult {
  const selected = opts.scenes.filter((s) =>
    opts.selectedIds instanceof Set ? opts.selectedIds.has(s.id) : opts.selectedIds.includes(s.id),
  )
  const useScenes = selected.length > 0 ? selected : opts.scenes
  const packLabel = PACK_LABEL[opts.packKey] ?? opts.packKey

  const modules: PublishedModuleItem[] = []
  const seen = new Set<string>()
  const capabilityKeys: string[] = []

  modules.push({
    key: opts.packKey,
    label: packLabel,
    iconKey: INDUSTRIES_SHOWCASE.find((i) => i.key === opts.packKey)?.iconKey ?? 'office',
    kind: 'industry',
    source: 'user',
  })
  seen.add(opts.packKey)

  for (const s of useScenes) {
    const key = s.capabilityKey
    if (!key || seen.has(key)) continue
    seen.add(key)
    capabilityKeys.push(key)
    modules.push({
      key,
      label: s.name,
      iconKey: iconFor(key),
      kind: 'module',
      source: 'auto',
    })
  }

  const scenarioNames = useScenes.map((s) => s.name)
  const fingerprint = shortHash(`${opts.packKey}:${scenarioNames.join('|')}`)
  const appId = `cache-${opts.packKey}-${fingerprint}`
  const webUrl = industryRuntimeWebUrl(opts.packKey)

  return {
    webUrl,
    appQr: webUrl,
    downloadUrl: undefined,
    appName: opts.appName || `${packLabel}应用`,
    iconUrl: opts.iconUrl,
    primaryColor: opts.primaryColor ?? '#4338ca',
    moduleCount: modules.length,
    modules,
    scenarios: scenarioNames,
    appId,
    schemaUrl: webUrl,
    source: 'industry-cache',
    deliver: 'web',
    contactEmail: opts.contactEmail,
    emailSent: false,
    emailConfigured: false,
    apkReady: false,
    webTemplateId: opts.webTemplateId ?? 'tabs_portal',
    appUiId: opts.appUiId ?? 'bottom_tabs',
    capabilityKeys,
    capabilityAssembly: {
      requested_keys: capabilityKeys,
      resolved_keys: capabilityKeys,
      dropped_keys: [],
      scenario_added_keys: capabilityKeys,
    },
  }
}
