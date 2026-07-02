import axios from 'axios'

export const api = axios.create({ baseURL: '/api/v1', timeout: 15000 })

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
  status: string
  created_at: string
  audience?: string
  deliver?: string
  source?: string
}

export const fetchCreatedApps = () =>
  api.get<{ items: CreatedApp[] }>('/creation/apps').then((r) => r.data.items)

// ── 智能问答 ──
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export const fetchChatConfig = () => api.get('/chat/config').then((r) => r.data)
export const fetchChatMessages = (sessionId = 'default') =>
  api.get<{ items: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`).then((r) => r.data.items)

export const sendChatMessage = (message: string, sessionId = 'default', model?: string) =>
  api.post<{ message: ChatMessage }>('/chat/completions', { message, session_id: sessionId, model }).then((r) => r.data)

// ── 知识库 ──
export const fetchKbStats = () => api.get('/kb/stats').then((r) => r.data)
export const fetchKbPipeline = () => api.get('/kb/pipeline').then((r) => r.data)
export const fetchKbBases = () => api.get('/kb/bases').then((r) => r.data.items)
export const fetchKbDocuments = (kbId?: string) =>
  api.get('/kb/documents', { params: kbId ? { kb_id: kbId } : {} }).then((r) => r.data.items)
export const createKbBase = (name: string, description = '') =>
  api.post('/kb/bases', { name, description }).then((r) => r.data)
export const searchKb = (query: string) =>
  api.post('/kb/search', { query }).then((r) => r.data)

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
export const approvalAction = (id: string, action: 'approve' | 'reject', comment = '') =>
  api.post(`/approvals/${id}/action`, { action, comment }).then((r) => r.data)

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
  industry_packs: number
  office_groups: number
}

export const fetchDashboard = () => api.get<DashboardStats>('/stats/dashboard').then((r) => r.data)
export const fetchAgents = () => api.get<{ items: Agent[] }>('/agents').then((r) => r.data.items)
export const fetchActivities = () => api.get('/stats/activities').then((r) => r.data.items)
export const fetchTrends = () => api.get('/stats/trends').then((r) => r.data)
export const fetchArchitecture = () => api.get('/stats/architecture').then((r) => r.data.layers)
export const fetchCatalogSummary = () => api.get<CatalogSummary>('/catalog/summary').then((r) => r.data)
export const fetchOfficeScenarios = (params?: { category?: string; q?: string }) =>
  api.get<{ items: OfficeScenario[]; groups: unknown[] }>('/catalog/office', { params }).then((r) => r.data)
export const fetchIndustryScenarios = (params?: { pack?: string; q?: string }) =>
  api.get<{ items: IndustryScenario[]; packs: unknown[] }>('/catalog/industry', { params }).then((r) => r.data)
export const fetchCapabilities = () => api.get('/catalog/modules').then((r) => r.data)
