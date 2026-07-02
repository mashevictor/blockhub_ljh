import axios from 'axios'
import { getToken, clearToken, redirectToLogin } from '../auth/storage'

export const api = axios.create({ baseURL: '/api/v1', timeout: 20000 })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = String(error.config?.url || '')
    if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/login-otp') && !url.includes('/auth/send-code')) {
      clearToken()
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

export interface CatalogSummary {
  office_count: number
  industry_count: number
  total: number
  hero_preset_count?: number
  chip_template_count?: number
  source?: string
}

export interface HeroPresetApi {
  id: string
  label: string
  hint: string
  role: string
  weight: number
  color: string
  prompt: string
  picks: Array<{ type: string; key: string; label: string }>
  flowLines: string[]
}

export async function fetchHeroPresets() {
  const res = await api.get<{ items: HeroPresetApi[]; total: number }>('/catalog/hero-presets')
  return res.data.items
}

export async function fetchChipTemplates() {
  const res = await api.get<{ items: Array<{ text: string; prompt: string; picks: HeroPresetApi['picks']; scenarioNames: string[] }> }>(
    '/catalog/chip-templates',
  )
  return res.data.items
}

export interface OfficeScenario {
  id: string
  name: string
  category: string
  category_icon: string
  agent: string
  type: 'office'
}

export interface IndustryScenario {
  id: string
  name: string
  category: string
  pack_key: string
  pack_name: string
  pack_icon: string
  problem: string
  standard: string
  agent: string
  type: 'industry'
}

export type CatalogScenario =
  | (OfficeScenario & { kind: 'office' })
  | (IndustryScenario & { kind: 'industry' })

export async function fetchAgents() {
  const res = await api.get<{ items: AgentInfo[] }>('/agents')
  return res.data.items
}

export interface AgentInfo {
  id: string
  name: string
  icon: string
  color: string
  description: string
}

export async function fetchCatalogSummary() {
  const res = await api.get<CatalogSummary>('/catalog/summary')
  return res.data
}

export async function fetchOfficeScenarios(params?: { category?: string; q?: string; lite?: boolean }) {
  const res = await api.get<{ items: OfficeScenario[] }>('/catalog/office', {
    params: { ...params, lite: params?.lite ? true : undefined },
  })
  return res.data.items
}

export async function fetchIndustryScenarios(params?: { pack?: string; q?: string; lite?: boolean }) {
  const res = await api.get<{ items: IndustryScenario[] }>('/catalog/industry', {
    params: { ...params, lite: params?.lite ? true : undefined },
  })
  return res.data.items
}

export interface PublishOptions {
  scenarioIds?: string[]
  scenarioNames?: string[]
  capabilityKeys?: string[]
  modules?: Array<{ key: string; label: string; kind: string; iconKey?: string; source?: string }>
  audience?: string
  deliver?: string
  source?: 'prompt' | 'industry' | 'module'
  prompt?: string
  contactEmail?: string
  contactPhone?: string
}

export interface CreatedApp {
  id: string
  name: string
  industry_key: string
  scenarios: string[]
  schema_url: string
  web_url?: string
  download_url?: string
  app_qr?: string
  status: string
  created_at: string
  audience?: string
  deliver?: string
  source?: string
  capability_keys?: string[]
  modules?: Array<{
    key: string
    label: string
    kind: string
    icon_key?: string
    source?: string
  }>
}

export async function publishApp(
  name: string,
  industryKey: string,
  opts: PublishOptions = {},
) {
  const res = await api.post<{ success: boolean; app: CreatedApp }>('/creation/publish', {
    name,
    industry_key: industryKey,
    scenario_ids: opts.scenarioIds ?? [],
    scenario_names: opts.scenarioNames ?? [],
    capability_keys: opts.capabilityKeys ?? [],
    modules: (opts.modules ?? []).map((m) => ({
      key: m.key,
      label: m.label,
      kind: m.kind,
      icon_key: m.iconKey,
      source: m.source,
    })),
    audience: opts.audience ?? 'both',
    deliver: opts.deliver ?? 'both',
    source: opts.source ?? 'industry',
    prompt: opts.prompt ?? '',
    contact_email: opts.contactEmail ?? '',
    contact_phone: opts.contactPhone ?? '',
  })
  return res.data
}

export async function fetchCreatedApps() {
  const res = await api.get<{ items: CreatedApp[] }>('/creation/apps')
  return res.data.items
}

export interface SuggestModuleItem {
  key: string
  label: string
  type: string
  score: number
  reason: string
  source: string
  flutter_pkg?: string
}

export interface SuggestModulesResult {
  items: SuggestModuleItem[]
  confidence: number
  used_llm: boolean
  supplemented: Array<{ key: string; label: string; flutter_pkg?: string; reason: string }>
  top_score: number
}

export async function suggestModules(text: string, forceLlm = false): Promise<SuggestModulesResult> {
  const res = await api.post<SuggestModulesResult>('/creation/suggest-modules', {
    text,
    force_llm: forceLlm,
  })
  return res.data
}

export async function fetchCapabilities() {
  const res = await api.get<{ total: number; items: Array<{ key: string; name: string; category: string; flutter_pkg: string }> }>('/creation/capabilities')
  return res.data
}

export async function fetchScenarios(industryKey: string) {
  const res = await api.get('/creation/scenarios', { params: { industry_key: industryKey } })
  return res.data.items as { id: string; name: string; category?: string; standard?: string }[]
}

export async function checkFeasibility(industryKey: string, scenarioIds: string[]) {
  const res = await api.post('/creation/feasibility', {
    industry_key: industryKey,
    scenario_ids: scenarioIds,
  })
  return res.data
}

/** 根据选中场景合成输入框文案 */
export function composePromptFromCatalog(
  selectedIds: string[],
  items: CatalogScenario[],
  industry?: { name: string; desc: string },
): string {
  const picked = items.filter((s) => selectedIds.includes(s.id))
  const intro = industry
    ? `我们是「${industry.name}」行业，${industry.desc}。\n\n需要搭建一套企业智能应用，包含以下场景：`
    : '我需要搭建一套企业智能应用，包含以下场景：'

  if (!selectedIds.length) {
    return industry ? `${intro}\n\n（请在下方点选具体场景，描述会自动补全）` : ''
  }
  if (!picked.length) return intro

  const byCat = picked.reduce<Record<string, CatalogScenario[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s)
    return acc
  }, {})
  const lines = Object.entries(byCat).map(([cat, list]) => {
    const sceneText = list.map((s) => s.name).join('、')
    return `\n【${cat}】${sceneText}`
  })
  const hasExternal = picked.some(
    (s) => s.kind === 'industry' && (s.pack_key === 'med' || s.pack_key === 'game'),
  )
  const footer = `\n\n系统将自动组合所需功能并生成网页版${hasExternal ? '，如需对外服务可同时生成对外轻量版' : ''}。`
  return intro + lines.join('') + footer
}

/** 综合行业勾选、办公分类、场景勾选生成提示词 */
export function composeFullPrompt(opts: {
  industries: { name: string; desc: string }[]
  officeCats: string[]
  selectedIds: string[]
  items: CatalogScenario[]
}): string {
  const { industries, officeCats, selectedIds, items } = opts
  const lines: string[] = []

  if (industries.length === 1) {
    lines.push(`我们是「${industries[0].name}」行业，${industries[0].desc}。`)
  } else if (industries.length > 1) {
    lines.push(`我们涉及 ${industries.length} 个行业：${industries.map((i) => i.name).join('、')}。`)
    for (const ind of industries) {
      lines.push(`· ${ind.name}：${ind.desc}`)
    }
  }

  if (officeCats.length > 0) {
    lines.push(`\n重点关注办公领域：${officeCats.join('、')}。`)
  }

  const picked = items.filter((s) => selectedIds.includes(s.id))

  if (selectedIds.length > 0 && picked.length > 0) {
    lines.push('\n需要搭建一套企业智能应用，包含以下场景：')
    const byCat = picked.reduce<Record<string, CatalogScenario[]>>((acc, s) => {
      (acc[s.category] ??= []).push(s)
      return acc
    }, {})
    for (const [cat, list] of Object.entries(byCat)) {
      lines.push(`\n【${cat}】${list.map((s) => s.name).join('、')}`)
    }
    const hasExternal = picked.some(
      (s) => s.kind === 'industry' && (s.pack_key === 'med' || s.pack_key === 'game'),
    )
    lines.push(`\n系统将自动组合所需功能并生成网页版${hasExternal ? '，如需对外服务可同时生成对外轻量版' : ''}。`)
  } else if (industries.length > 0 || officeCats.length > 0) {
    lines.push('\n（请在下方勾选具体场景，描述会自动补全）')
  }

  return lines.join('')
}
