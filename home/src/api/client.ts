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
    if ((error.response?.status === 401 || error.response?.status === 403) && !url.includes('/auth/login') && !url.includes('/auth/login-otp') && !url.includes('/auth/send-code')) {
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
  base_scenario_total?: number
  capability_count?: number
  agent_count?: number
  industry_packs?: number
  office_groups?: number
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

export interface IndustryPackScene {
  id: string
  name: string
  category: string
  problem?: string
  pages?: string
  standard?: string
  agent?: string
  type: 'office' | 'industry'
}

export interface IndustryPackEnrichment {
  overview: string
  highlights?: string[]
  recommended_modules?: string[]
  scene_tips?: Array<{ name: string; tip: string }>
  source?: 'deepseek' | 'static' | 'generated'
}

export interface IndustryPackSite {
  slug: string
  title: string
  description: string
  keywords?: string
  assets: {
    hero: string
    og: string
    thumb: string
  }
  theme: {
    primary: string
    gradient_to?: string
  }
  stats: {
    scenes: number
    platforms: number
    delivery: string
  }
  cta: {
    create_label: string
    create_href: string
  }
  site_url: string
}

export interface IndustryPackDetail {
  pack: {
    key: string
    name: string
    icon: string
    color: string
    tagline: string
  }
  scenes: IndustryPackScene[]
  groups: Array<{ category: string; items: IndustryPackScene[] }>
  total: number
  full_pack: boolean
  site: IndustryPackSite
  enrichment?: IndustryPackEnrichment
}

export interface IndustrySiteSummary {
  key: string
  name: string
  icon: string
  color: string
  tagline: string
  scenes: number
  site_url: string
  assets: IndustryPackSite['assets']
  theme: IndustryPackSite['theme']
}

export async function fetchIndustrySites() {
  const res = await api.get<{ total: number; items: IndustrySiteSummary[] }>('/catalog/industry-sites')
  return res.data.items
}

export async function fetchIndustryPackDetail(
  packKey: string,
  options?: { enrich?: boolean },
) {
  const res = await api.get<IndustryPackDetail>(`/catalog/industry/${packKey}`, {
    params: { enrich: options?.enrich ? true : undefined },
  })
  return res.data
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
  iconUrl?: string
  primaryColor?: string
  appId?: string
  webTemplateId?: string
  appUiId?: string
}

export interface WebTemplate {
  id: string
  label: string
  desc: string
  layout?: string
}

export interface AppUiTemplate {
  id: string
  label: string
  desc: string
  voice_demo?: boolean
}

export async function fetchDeliveryTemplates() {
  const res = await api.get<{
    web_templates: WebTemplate[]
    app_ui_templates: AppUiTemplate[]
    defaults?: { web_template_id?: string; app_ui_id?: string }
  }>('/creation/delivery-templates')
  return res.data
}

export async function fetchCodegenJob(jobId: string) {
  const res = await api.get<{
    id: string
    status: string
    app_id?: string
    result?: { page_count?: number; routes?: string[]; llm?: boolean }
    error?: string
  }>(`/creation/codegen-jobs/${jobId}`)
  return res.data
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
  icon_url?: string
  primary_color?: string
  status: string
  created_at: string
  audience?: string
  deliver?: string
  source?: string
  capability_keys?: string[]
  page_schema?: Record<string, unknown>
  build_manifest?: {
    web_pkgs?: string[]
    flutter_pkgs?: string[]
    capability_keys?: string[]
  }
  modules?: Array<{
    key: string
    label: string
    kind: string
    icon_key?: string
    source?: string
  }>
}

export interface RuntimeInfo {
  public_id: string
  name: string
  deliver: string
  schema_url: string
  icon_url?: string
  primary_color?: string
  web_url?: string
  download_url?: string
  web_ready: boolean
  apk_ready: boolean
  apk_build_status?: 'pending' | 'building' | 'ready' | 'failed' | 'skipped'
  modules?: unknown[]
  capability_keys?: string[]
}

export async function fetchRuntimeInfo(publicId: string) {
  const res = await api.get<RuntimeInfo>(`/runtime/${publicId}`)
  return res.data
}

export async function publishApp(
  name: string,
  industryKey: string,
  opts: PublishOptions = {},
) {
  const res = await api.post<{
    success: boolean
    app: CreatedApp
    codegen_job_id?: string | null
    capability_assembly?: {
      resolved_keys?: string[]
      dropped_keys?: string[]
      requested_keys?: string[]
    }
    runtime?: {
      apk_ready?: boolean
      web_url?: string
      download_url?: string
      deliver?: string
      web_template_id?: string
      app_ui_id?: string
    }
    notification?: { email?: string; email_sent?: boolean; email_configured?: boolean }
  }>(
    '/creation/publish',
    {
      name,
      industry_key: industryKey,
      app_id: opts.appId ?? '',
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
      icon_url: opts.iconUrl ?? '',
      primary_color: opts.primaryColor ?? '#4338ca',
      web_template_id: opts.webTemplateId ?? 'tabs_portal',
      app_ui_id: opts.appUiId ?? 'bottom_tabs',
    },
    { timeout: 90000 },
  )
  return res.data
}

export async function uploadAppIcon(dataUrl: string) {
  const res = await api.post<{ success: boolean; icon_url: string }>('/creation/upload-icon', {
    data_url: dataUrl,
  })
  return res.data.icon_url
}

export async function fetchCreatedApps() {
  const res = await api.get<{ items: CreatedApp[] }>('/creation/apps')
  return res.data.items
}

export interface PlazaFeedApiItem {
  id: string
  appKey: string
  authorName: string
  authorInitial: string
  authorMeta: string
  publishedAt?: string
  visibility: 'public' | 'org' | 'dept'
  atLabel: string
  appName: string
  modules: string[]
  summary: string
  webUrl: string
  likes: number
  comments: number
  reposts: number
  plaza_visibility?: string
  plaza_dept_name?: string
}

export async function fetchPlazaFeed() {
  const res = await api.get<{ total: number; items: PlazaFeedApiItem[] }>('/creation/plaza/feed')
  return res.data.items
}

export async function publishAppToPlaza(appId: string, visibility: string, deptName = '') {
  const res = await api.post<{
    success: boolean
    app: CreatedApp & { plaza_visibility?: string; plaza_dept_name?: string; plaza_published_at?: string }
    feed_item: PlazaFeedApiItem
  }>('/creation/plaza/publish', {
    app_id: appId,
    visibility,
    dept_name: deptName,
  })
  return res.data
}

const PLAZA_USER_KEY = 'blockhub_plaza_user_key'

export function getPlazaUserKey(): string {
  try {
    let key = localStorage.getItem(PLAZA_USER_KEY)
    if (!key) {
      key = `guest-${Date.now().toString(36)}`
      localStorage.setItem(PLAZA_USER_KEY, key)
    }
    return key
  } catch {
    return 'anonymous'
  }
}

export async function togglePlazaFeedLike(appId: string) {
  const res = await api.post<{ liked: boolean; likes: number; comments: number }>(
    `/creation/plaza/feed/${appId}/like`,
    { user_key: getPlazaUserKey() },
  )
  return res.data
}

export async function postPlazaFeedComment(appId: string, text: string, authorName = '访客') {
  const res = await api.post<{ id: string; author: string; text: string; likes: number; comments: number }>(
    `/creation/plaza/feed/${appId}/comment`,
    { author_name: authorName, text },
  )
  return res.data
}

export async function fetchPlazaFeedComments(appId: string) {
  const res = await api.get<{ items: Array<{ id: string; author: string; text: string }>; total: number }>(
    `/creation/plaza/feed/${appId}/comments`,
  )
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

export interface SuggestValidation {
  status: 'valid' | 'unclear' | 'invalid'
  confidence: number
  intent_summary?: string
  rejection_reason?: string
  guidance?: string
}

export interface SuggestModulesResult {
  items: SuggestModuleItem[]
  confidence: number
  used_llm: boolean
  agent?: string
  supplemented: Array<{ key: string; label: string; flutter_pkg?: string; reason: string }>
  registered?: { industries: string[]; capabilities: string[]; scenes: string[] }
  validation?: SuggestValidation | null
  top_score: number
}

export async function suggestModules(text: string, forceLlm = true): Promise<SuggestModulesResult> {
  const res = await api.post<SuggestModulesResult>(
    '/creation/suggest-modules',
    { text, force_llm: forceLlm },
    { timeout: 60000 },
  )
  return res.data
}

/** 编排工作台问答 — 服务端 DeepSeek */
export async function askFlowQuestion(opts: {
  question: string
  appName?: string
  modules?: string[]
  nodes?: string[]
  activeNode?: string
  activeSide?: 'input' | 'output' | null
  extraContext?: string
}): Promise<{ answer: string; source: 'deepseek' | 'fallback'; llm_configured: boolean }> {
  const res = await api.post<{
    answer: string
    source: 'deepseek' | 'fallback'
    llm_configured: boolean
  }>(
    '/creation/flow-ask',
    {
      question: opts.question,
      app_name: opts.appName ?? '',
      modules: opts.modules ?? [],
      nodes: opts.nodes ?? [],
      active_node: opts.activeNode ?? '',
      active_side: opts.activeSide === 'output' ? 'output' : 'input',
      extra_context: opts.extraContext ?? '',
    },
    { timeout: 60000 },
  )
  return res.data
}

export interface CatalogCapability {
  key: string
  name: string
  category: string
  widget: string
  agent_id: string
}

export async function fetchCatalogModules() {
  const res = await api.get<{
    total: number
    items: CatalogCapability[]
    by_category: Record<string, CatalogCapability[]>
    source?: string
  }>('/catalog/modules')
  return res.data
}

export interface VoiceClientConfig {
  agent_id: string
  ws_url: string
  ws_path: string
  capture_sample_rate: number
  playback_sample_rate: number
  frame_ms: number
  dialect: string
  configured: boolean
  llm_provider?: string
  greeting?: string
  demo_samples?: Array<{ label: string; utterance: string }>
}

export async function fetchVoiceConfig() {
  const res = await api.get<VoiceClientConfig>('/voice/config')
  return res.data
}

/** @deprecated use fetchCatalogModules */
export async function fetchCapabilities() {
  return fetchCatalogModules()
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

export interface DemoBookingPayload {
  contact: string
  salutation?: string
  company_name?: string
  source?: string
}

export interface DemoBookingDelivery {
  id: string
  shareToken: string
  shareUrl: string
  agentSummary: string
  contactEmail: string
  contactPhoneMasked: string
  emailSent: boolean
  smsSent: boolean
  local?: boolean
}

export interface ShareArtifact {
  id: string
  title: string
  description: string
  href: string
}

export interface SharePack {
  token: string
  salutation: string
  company_name: string
  agent_summary: string
  artifacts: ShareArtifact[]
  created_at: string
}

function normalizeShareUrl(token: string, apiUrl: string): string {
  if (!token) return apiUrl
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/share/${encodeURIComponent(token)}`
  }
  return apiUrl
}

function mapBookingResponse(data: {
  id: string
  ok?: boolean
  share_token?: string
  share_url?: string
  agent_summary?: string
  contact_email?: string
  contact_phone_masked?: string
  email_sent?: boolean
  sms_sent?: boolean
}): DemoBookingDelivery {
  const shareToken = data.share_token ?? ''
  return {
    id: data.id,
    shareToken,
    shareUrl: normalizeShareUrl(shareToken, data.share_url ?? ''),
    agentSummary: data.agent_summary ?? '',
    contactEmail: data.contact_email ?? '',
    contactPhoneMasked: data.contact_phone_masked ?? '',
    emailSent: Boolean(data.email_sent),
    smsSent: Boolean(data.sms_sent),
  }
}

export async function submitDemoBooking(payload: DemoBookingPayload): Promise<DemoBookingDelivery> {
  const res = await api.post<{
    id: string
    ok: boolean
    share_token: string
    share_url: string
    agent_summary: string
    contact_email: string
    contact_phone_masked: string
    email_sent: boolean
    sms_sent: boolean
  }>('/demo-bookings', payload)
  return mapBookingResponse(res.data)
}

/** 优先后端保存，离线时落本地，避免预约区误报失败 */
export async function submitDemoBookingWithFallback(payload: DemoBookingPayload): Promise<DemoBookingDelivery> {
  try {
    return await submitDemoBooking(payload)
  } catch {
    const { saveDemoBookingLocal } = await import('../auth/demoBookingStorage')
    const local = saveDemoBookingLocal(payload)
    return {
      id: `local-${local.savedAt}`,
      shareToken: '',
      shareUrl: '',
      agentSummary: '',
      contactEmail: payload.contact.includes('@') ? payload.contact : '',
      contactPhoneMasked: payload.contact.includes('@') ? '' : payload.contact,
      emailSent: false,
      smsSent: false,
      local: true,
    }
  }
}

export async function fetchSharePack(token: string): Promise<SharePack> {
  const res = await api.get<SharePack>(`/share/${encodeURIComponent(token)}`)
  return res.data
}
