import axios from 'axios'
import { readStoredLocale } from '@blockhub/i18n'
import { getToken, redirectToLogin, clearToken } from '../auth/storage'

export const api = axios.create({ baseURL: '/api/v1', timeout: 45000 })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['Accept-Language'] = readStoredLocale()
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = String(error.config?.url || '')
    // 仅 401 清会话；403 是权限不足，不应当成掉线
    if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/login-otp') && !url.includes('/auth/send-code')) {
      clearToken()
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

// ── 智能创建 ──
export interface IndustryPack {
  key: string
  name: string
  icon: string
  color: string
  scene_count: number
  description: string
  preview: string
}

export interface WizardStep {
  step: number
  title: string
  key: string
}

export const fetchCreationWizard = () =>
  api.get<{ steps: WizardStep[]; industry_packs: IndustryPack[] }>('/creation/wizard').then((r) => r.data)

export const fetchCreationScenarios = (industryKey: string) =>
  api.get<{ items: { id: string; name: string; category?: string; standard?: string }[] }>(
    '/creation/scenarios',
    { params: { industry_key: industryKey } },
  ).then((r) => r.data)

export const checkFeasibility = (industryKey: string, scenarioIds: string[]) =>
  api.post('/creation/feasibility', { industry_key: industryKey, scenario_ids: scenarioIds }).then((r) => r.data)

export const publishApp = (
  name: string,
  industryKey: string,
  scenarioIdsOrOpts: string[] | {
    scenarioIds?: string[]
    scenarioNames?: string[]
    audience?: string
    deliver?: string
    source?: string
    prompt?: string
  } = [],
) => {
  const opts = Array.isArray(scenarioIdsOrOpts)
    ? { scenarioIds: scenarioIdsOrOpts }
    : scenarioIdsOrOpts
  return api.post('/creation/publish', {
    name,
    industry_key: industryKey,
    scenario_ids: opts.scenarioIds ?? [],
    scenario_names: opts.scenarioNames ?? [],
    audience: opts.audience ?? 'both',
    deliver: opts.deliver ?? 'both',
    source: opts.source ?? 'industry',
    prompt: opts.prompt ?? '',
  }).then((r) => r.data)
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
  prompt?: string
  modules?: Array<{
    key: string
    label: string
    kind: string
    icon_key?: string
    source?: string
  }>
}

export const fetchCreatedApps = () =>
  api.get<{ items: CreatedApp[] }>('/creation/apps').then((r) => r.data.items)

// ── 智能问答 ──
export interface ChatCitation {
  index: number
  doc_name: string
  document_id: string
  chunk_index: number
  snippet: string
  score?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  citations?: ChatCitation[]
  source?: string
}

export const fetchChatConfig = () => api.get('/chat/config').then((r) => r.data)
export const fetchChatMessages = (sessionId = 'default') =>
  api.get<{ items: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`).then((r) => r.data.items)

export const sendChatMessage = (message: string, sessionId = 'default', model?: string) =>
  api.post<{ message: ChatMessage }>('/chat/completions', { message, session_id: sessionId, model }).then((r) => r.data)

export async function sendChatMessageStream(
  message: string,
  sessionId: string,
  model: string,
  onChunk: (content: string, done: boolean, source?: string, citations?: ChatCitation[]) => void,
  options?: { useRag?: boolean; kbId?: string; topK?: number },
): Promise<void> {
  const token = getToken()
  const res = await fetch('/api/v1/chat/completions/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      model,
      use_rag: options?.useRag ?? true,
      kb_id: options?.kbId ?? null,
      top_k: options?.topK ?? 4,
    }),
  })
  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      redirectToLogin()
    }
    throw new Error(`Chat stream failed: ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') {
        onChunk('', true)
        return
      }
      try {
        const data = JSON.parse(payload) as {
          content?: string
          done?: boolean
          source?: string
          citations?: ChatCitation[]
        }
        if (data.content != null) {
          onChunk(data.content, Boolean(data.done), data.source, data.citations)
        }
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}

// ── 知识库 ──
export const fetchKbStats = () => api.get('/kb/stats').then((r) => r.data)
export const fetchKbPipeline = () => api.get('/kb/pipeline').then((r) => r.data)
export const fetchKbBases = () => api.get('/kb/bases').then((r) => r.data.items)
export const fetchKbDocuments = (kbId?: string) =>
  api.get('/kb/documents', { params: kbId ? { kb_id: kbId } : {} }).then((r) => r.data.items)
export const createKbBase = (name: string, description = '') =>
  api.post('/kb/bases', { name, description }).then((r) => r.data)
export const searchKb = (query: string, kbId?: string, topK = 5) =>
  api.post('/kb/search', { query, kb_id: kbId ?? null, top_k: topK }).then((r) => r.data)

export async function uploadKbDocument(kbId: string, file: File) {
  const form = new FormData()
  form.append('kb_id', kbId)
  form.append('file', file)
  const token = getToken()
  const res = await fetch('/api/v1/kb/documents/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      redirectToLogin()
    }
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `上传失败 (${res.status})`)
  }
  return res.json()
}

export const reindexKbDocument = (docId: string) =>
  api.post(`/kb/documents/${docId}/reindex`).then((r) => r.data)

// ── 审批 ──
export interface ApprovalItem {
  id: string
  title: string
  applicant: string
  department: string
  status: 'pending' | 'approved' | 'rejected'
  type: string
  submitted_at: string
  summary: string
  comment?: string
}

export const fetchApprovalStats = () => api.get('/approvals/stats').then((r) => r.data)
export const fetchApprovals = (status?: string) =>
  api.get<{ items: ApprovalItem[] }>('/approvals', { params: status ? { status } : {} }).then((r) => r.data.items)
export const submitApproval = (payload: {
  title: string
  type?: string
  department?: string
  summary?: string
}) => api.post('/approvals', payload).then((r) => r.data)
export const approvalAction = (id: string, action: 'approve' | 'reject', comment = '') =>
  api.post(`/approvals/${id}/action`, { action, comment }).then((r) => r.data)

// ── 自定义能力审核 ──
export interface CustomCapabilityItem {
  id: string
  key: string
  name: string
  category: string
  description: string
  keywords: string[]
  status: 'pending' | 'approved' | 'rejected'
  proposed_by_id: string
  created_at: string
}

export const fetchCustomCapabilities = (status?: string) =>
  api
    .get<{ total: number; items: CustomCapabilityItem[] }>('/creation/custom-capabilities', {
      params: { status: status ?? 'all' },
    })
    .then((r) => r.data)

export const proposeCustomCapability = (payload: {
  key: string
  name: string
  category?: string
  description?: string
  keywords?: string[]
}) => api.post('/creation/custom-capabilities', payload).then((r) => r.data)

export const reviewCustomCapability = (id: string, action: 'approve' | 'reject') =>
  api.post(`/creation/custom-capabilities/${id}/review`, { action }).then((r) => r.data)

// ── 报表 ──
export const fetchReportDashboard = () => api.get('/reports/dashboard').then((r) => r.data)
export const nlQuery = (question: string) =>
  api.post('/reports/nl-query', { question }).then((r) => r.data)
export const exportReport = (format = 'xlsx') =>
  api.get('/reports/export', { params: { format } }).then((r) => r.data)

// ── 通知 ──
export interface NotificationItem {
  id: string
  title: string
  content: string
  type: string
  read: boolean
  time: string
}

export const fetchNotifications = (read?: 'unread' | 'read') =>
  api.get<{ items: NotificationItem[]; unread: number }>('/notifications', {
    params: read ? { read } : {},
  }).then((r) => r.data)

export const markNotificationRead = (id: string) =>
  api.post(`/notifications/${id}/read`).then((r) => r.data)

// ── 集成（W4 七 Agent · 系统对接）──
export interface Connector {
  id: string
  name: string
  connector_type: string
  config: Record<string, unknown>
  status: string
  last_sync_at: string | null
  created_at: string
}
export interface EtlJobItem {
  id: string
  status: string
  trigger: string
  result: Record<string, unknown> | null
  ran_at: string | null
  created_at: string
}

export const fetchConnectors = () =>
  api.get<{ total: number; items: Connector[] }>('/integrations').then((r) => r.data)
export const createConnector = (payload: { name: string; connector_type?: string; config?: Record<string, unknown> }) =>
  api.post('/integrations', payload).then((r) => r.data)
export const updateConnector = (id: string, payload: Partial<Connector>) =>
  api.patch(`/integrations/${id}`, payload).then((r) => r.data)
export const deleteConnector = (id: string) =>
  api.delete(`/integrations/${id}`).then((r) => r.data)
export const syncConnector = (id: string) =>
  api.post(`/integrations/${id}/sync`).then((r) => r.data)
export const fetchConnectorJobs = (id: string) =>
  api.get<{ total: number; items: EtlJobItem[] }>(`/integrations/${id}/jobs`).then((r) => r.data)


export const markAllNotificationsRead = () =>
  api.post('/notifications/read-all').then((r) => r.data)

// ── 原有 API ──
export interface DashboardStats {
  status: string
  status_text: string
  agents: number
  capabilities: number
  office_scenarios: number
  industry_scenarios: number
  total_scenarios: number
  apps_created: number
  chat_sessions: number
  pending_approvals: number
  unread_notifications: number
}

export interface Agent {
  id: string
  name: string
  icon: string
  color: string
  status: string
  description: string
  pipeline: string
  capabilities: string[]
  office_count: number
  industry_count: number
}

export interface OfficeScenario {
  id: string
  name: string
  category: string
  category_icon: string
  agent: string
  type: 'office'
  auto_generate: string
}

export interface IndustryScenario {
  id: string
  name: string
  category: string
  pack_key: string
  pack_name: string
  pack_icon: string
  pack_color: string
  problem: string
  pages: string
  standard: string
  agent: string
  type: 'industry'
}

export interface CatalogSummary {
  office_count: number
  industry_count: number
  total: number
  capability_count: number
  agent_count?: number
  industry_packs: number
  office_groups: number
}

export const fetchDashboard = () => api.get<DashboardStats>('/stats/dashboard').then((r) => r.data)

export interface TenantConfigPayload {
  app_name?: string
  app_icon_url?: string
  primary_color?: string
  theme?: string
  menu?: Array<{ key: string; label: string; icon: string }>
}

export const fetchTenantConfig = (tenant = 'demo') =>
  api.get<TenantConfigPayload & { tenant_slug: string; tenant_name: string }>('/tenant/config', { params: { tenant } }).then((r) => r.data)

export const updateTenantConfig = (payload: TenantConfigPayload, tenant = 'demo') =>
  api.put('/tenant/config', payload, { params: { tenant } }).then((r) => r.data)

export const fetchAgents = () => api.get<{ items: Agent[] }>('/agents').then((r) => r.data.items)
export const fetchActivities = () => api.get('/stats/activities').then((r) => r.data.items)
export const fetchTrends = () => api.get('/stats/trends').then((r) => r.data)
export const fetchArchitecture = () => api.get('/stats/architecture').then((r) => r.data.layers)
export const fetchCatalogSummary = () => api.get<CatalogSummary>('/catalog/summary').then((r) => r.data)
export const fetchOfficeScenarios = (params?: { category?: string; q?: string; limit?: number; offset?: number }) =>
  api.get<{ items: OfficeScenario[]; groups: unknown[]; total: number; limit: number; offset: number }>('/catalog/office', { params }).then((r) => r.data)
export const fetchIndustryScenarios = (params?: { pack?: string; q?: string; limit?: number; offset?: number }) =>
  api.get<{ items: IndustryScenario[]; packs: unknown[]; total: number; limit: number; offset: number }>('/catalog/industry', { params }).then((r) => r.data)
export const fetchCapabilities = () => api.get('/catalog/modules').then((r) => r.data)

// ── 合同盖章 Agent ──
export interface ContractAsset {
  id: string
  asset_type: 'signature' | 'seal'
  file_key: string
  file_url: string
  label: string
  placement: { page?: number; x_pct?: number; y_pct?: number; width_pct?: number; height_pct?: number }
}

export interface ContractRecord {
  id: string
  title: string
  template_key: string
  body_html: string
  parties: { party_a?: string; party_b?: string; fields?: Record<string, string>; seal_company?: string }
  field_values?: Record<string, string>
  status: string
  review_notes: string
  signed_pdf_url: string
  created_at: string
  updated_at: string
  signed_at: string | null
  assets?: ContractAsset[]
}

export interface ContractFieldDef {
  key: string
  label: string
  section: string
  type: string
  required?: boolean
  placeholder?: string
  default?: string
  options?: string[]
}

export interface ContractTemplateDetail {
  key: string
  name: string
  description: string
  category: string
  fields: ContractFieldDef[]
  sample_body_html: string
}

export const fetchContractTemplate = (key: string) =>
  api.get<ContractTemplateDetail>(`/contracts/templates/${key}`).then((r) => r.data)
export const renderContractFields = (id: string, fieldValues: Record<string, string>, rerender = true) =>
  api.post<{ contract: ContractRecord }>(`/contracts/${id}/render`, { field_values: fieldValues, rerender }).then((r) => r.data.contract)
export const aiGenerateContract = (id: string) =>
  api.post<{ contract: ContractRecord }>(`/contracts/${id}/generate`).then((r) => r.data.contract)
export const createDefaultSeal = (id: string, opts?: { company_name?: string; seal_text?: string; style?: string }) =>
  api.post<{ contract: ContractRecord }>(`/contracts/${id}/default-seal`, opts || {}).then((r) => r.data.contract)

export const fetchContractsConfig = () => api.get('/contracts/config').then((r) => r.data)
export const fetchContracts = () => api.get<{ items: ContractRecord[] }>('/contracts').then((r) => r.data.items)
export const fetchContract = (id: string) => api.get<ContractRecord>(`/contracts/${id}`).then((r) => r.data)
export const createContract = (body: { title?: string; template_key?: string; field_values?: Record<string, string> }) =>
  api.post<{ contract: ContractRecord }>('/contracts', body).then((r) => r.data.contract)
export const updateContract = (id: string, body: Partial<{ title: string; body_html: string; template_key: string; field_values: Record<string, string> }>) =>
  api.put<{ contract: ContractRecord }>(`/contracts/${id}`, body).then((r) => r.data.contract)
export const aiDraftContract = (id: string, prompt: string) =>
  api.post<{ contract: ContractRecord }>(`/contracts/${id}/draft`, { prompt }).then((r) => r.data.contract)
export const aiReviewContract = (id: string) =>
  api.post<{ contract: ContractRecord }>(`/contracts/${id}/review`).then((r) => r.data.contract)
export const uploadContractAsset = (id: string, body: { asset_type: string; data_url: string; label?: string; placement?: ContractAsset['placement'] }) =>
  api.post<{ contract: ContractRecord }>(`/contracts/${id}/assets`, body).then((r) => r.data.contract)
export const updateContractPlacements = (id: string, items: { id: string; placement: ContractAsset['placement'] }[]) =>
  api.put<{ contract: ContractRecord }>(`/contracts/${id}/placements`, { items }).then((r) => r.data.contract)
export const signContract = (id: string) =>
  api.post<{ contract: ContractRecord }>(`/contracts/${id}/sign`).then((r) => r.data.contract)
export const deleteContract = (id: string) => api.delete(`/contracts/${id}`).then((r) => r.data)
export const fetchContractPreviewBlob = (id: string) =>
  api.get(`/contracts/${id}/preview.pdf`, { responseType: 'blob' }).then((r) => r.data as Blob)
export const downloadSignedPdfBlob = (id: string) =>
  api.get(`/contracts/${id}/signed.pdf`, { responseType: 'blob' }).then((r) => r.data as Blob)
