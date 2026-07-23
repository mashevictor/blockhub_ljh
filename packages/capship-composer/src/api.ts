import type { ComposeEditOp, ComposerPageSchema, FlowEditOp, SchemaRevisionItem } from './types'

function authHeaders(token?: string | null): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export class SchemaRevConflictError extends Error {
  status = 409
  schema_rev: number
  schema_editor_name: string
  page_schema?: ComposerPageSchema

  constructor(detail: {
    message?: string
    schema_rev?: number
    schema_editor_name?: string
    page_schema?: ComposerPageSchema
  }) {
    super(detail.message || '页面版本冲突，请先拉取最新')
    this.name = 'SchemaRevConflictError'
    this.schema_rev = detail.schema_rev ?? 0
    this.schema_editor_name = detail.schema_editor_name || ''
    this.page_schema = detail.page_schema
  }
}

async function parsePatchError(res: Response): Promise<never> {
  const raw = await res.text()
  if (res.status === 409) {
    try {
      const body = JSON.parse(raw) as { detail?: Record<string, unknown> | string }
      const d = typeof body.detail === 'object' && body.detail ? body.detail : {}
      throw new SchemaRevConflictError({
        message: typeof d.message === 'string' ? d.message : '页面版本冲突',
        schema_rev: typeof d.schema_rev === 'number' ? d.schema_rev : undefined,
        schema_editor_name: typeof d.schema_editor_name === 'string' ? d.schema_editor_name : '',
        page_schema: d.page_schema as ComposerPageSchema | undefined,
      })
    } catch (e) {
      if (e instanceof SchemaRevConflictError) throw e
    }
  }
  throw new Error(raw || `request failed (${res.status})`)
}

export async function fetchRuntimeSchema(
  appId: string,
  opts?: { token?: string | null },
): Promise<{
  page_schema: ComposerPageSchema
  schema_rev: number
  schema_editor_name?: string
  schema_updated_at?: string | null
}> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema`, {
    headers: authHeaders(opts?.token),
  })
  if (!res.ok) throw new Error(`拉取页面失败 (${res.status})`)
  const data = await res.json()
  return {
    page_schema: data.page_schema,
    schema_rev: Number(data.schema_rev || 1),
    schema_editor_name: data.schema_editor_name || '',
    schema_updated_at: data.schema_updated_at ?? null,
  }
}

export async function fetchSchemaRevisions(
  appId: string,
  opts?: { token?: string | null; limit?: number },
): Promise<{ schema_rev: number; schema_editor_name?: string; items: SchemaRevisionItem[] }> {
  const res = await fetch(
    `/api/v1/runtime/${appId}/schema/revisions?limit=${opts?.limit ?? 20}`,
    { headers: authHeaders(opts?.token) },
  )
  if (!res.ok) throw new Error(`拉取版本历史失败 (${res.status})`)
  return res.json()
}

export async function restoreSchemaRevision(
  appId: string,
  body: { rev: number; base_rev?: number; force?: boolean },
  opts?: { token?: string | null },
): Promise<{
  success: boolean
  page_schema: ComposerPageSchema
  schema_rev: number
  schema_editor_name?: string
}> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema/restore`, {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
  })
  if (!res.ok) await parsePatchError(res)
  return res.json()
}

export async function patchRuntimeSchema(
  appId: string,
  pageSchema: ComposerPageSchema,
  opts?: {
    token?: string | null
    mergeMeta?: Record<string, unknown>
    baseRev?: number | null
    force?: boolean
    source?: string
    directPublish?: boolean
  },
): Promise<{
  success: boolean
  page_schema: ComposerPageSchema
  schema_rev: number
  schema_editor_name?: string
  superseded_changes?: number
  supersede_detail?: {
    closed_count: number
    change_ids: string[]
    by_status?: { draft?: number; pending?: number }
    notifications_cleared?: number
    notifications_sent?: number
  }
}> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema`, {
    method: 'PATCH',
    headers: authHeaders(opts?.token),
    body: JSON.stringify({
      page_schema: pageSchema,
      merge_meta: opts?.mergeMeta ?? null,
      base_rev: opts?.baseRev ?? null,
      force: opts?.force ?? false,
      source: opts?.source ?? 'compose',
      direct_publish: opts?.directPublish ?? true,
    }),
  })
  if (!res.ok) await parsePatchError(res)
  return res.json()
}

export type SchemaChangeItem = {
  id: string
  public_id: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | string
  base_rev: number
  page_schema?: ComposerPageSchema | null
  capability_keys?: string[]
  summary: string
  author_id: string
  author_name: string
  reviewer_id?: string | null
  reviewer_name?: string
  review_comment?: string
  published_rev?: number | null
  created_at?: string | null
  updated_at?: string | null
  submitted_at?: string | null
  reviewed_at?: string | null
}

export async function upsertSchemaChangeDraft(
  appId: string,
  body: { page_schema: ComposerPageSchema; summary?: string; change_id?: string },
  opts?: { token?: string | null },
): Promise<{ success: boolean; change: SchemaChangeItem; schema_rev: number }> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema/changes`, {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
  })
  if (!res.ok) await parsePatchError(res)
  return res.json()
}

export async function submitSchemaChange(
  appId: string,
  body: { change_id?: string; page_schema?: ComposerPageSchema; summary?: string },
  opts?: { token?: string | null },
): Promise<{
  success: boolean
  change: SchemaChangeItem
  schema_rev: number
  requires_approval?: boolean
  auto_published?: boolean
  page_schema?: ComposerPageSchema
  capability_keys?: string[]
}> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema/changes/submit`, {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
  })
  if (!res.ok) await parsePatchError(res)
  return res.json()
}

export async function listSchemaChanges(
  appId: string,
  opts?: { token?: string | null; status?: string; limit?: number },
): Promise<{
  public_id: string
  is_admin: boolean
  schema_approval?: boolean
  can_direct_publish?: boolean
  items: SchemaChangeItem[]
  schema_rev: number
}> {
  const q = new URLSearchParams()
  if (opts?.status) q.set('status', opts.status)
  if (opts?.limit) q.set('limit', String(opts.limit))
  const qs = q.toString() ? `?${q}` : ''
  const res = await fetch(`/api/v1/runtime/${appId}/schema/changes${qs}`, {
    headers: authHeaders(opts?.token),
  })
  if (!res.ok) throw new Error(`拉取变更单失败 (${res.status})`)
  return res.json()
}

export async function approveSchemaChange(
  appId: string,
  changeId: string,
  body?: { comment?: string; force?: boolean },
  opts?: { token?: string | null },
): Promise<{
  success: boolean
  change: SchemaChangeItem
  page_schema?: ComposerPageSchema
  schema_rev: number
}> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema/changes/${changeId}/approve`, {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) await parsePatchError(res)
  return res.json()
}

export async function rejectSchemaChange(
  appId: string,
  changeId: string,
  body?: { comment?: string },
  opts?: { token?: string | null },
): Promise<{ success: boolean; change: SchemaChangeItem; schema_rev: number }> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema/changes/${changeId}/reject`, {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) await parsePatchError(res)
  return res.json()
}

export async function patchRuntimeModules(
  appId: string,
  body: {
    capability_keys: string[]
    modules?: Array<Record<string, unknown>>
    rebuild_schema?: boolean
    menu_plan?: Array<Record<string, unknown>>
    base_rev?: number | null
    force?: boolean
    source?: string
  },
  opts?: { token?: string | null },
): Promise<{
  success: boolean
  page_schema?: ComposerPageSchema
  capability_keys?: string[]
  build_manifest?: Record<string, unknown>
  schema_rev?: number
  schema_editor_name?: string
}> {
  const res = await fetch(`/api/v1/runtime/${appId}/modules`, {
    method: 'PATCH',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
  })
  if (!res.ok) await parsePatchError(res)
  return res.json()
}

export async function askComposeEdit(
  body: {
    instruction: string
    app_name?: string
    app_id?: string
    menu?: Array<{ key?: string; label?: string; capability_key?: string; category?: string }>
    capability_keys?: string[]
    /** data URL 截图，最多 3 张 */
    images?: string[]
    /** 最近对话（不含本轮），供识图后结合上下文解意图 */
    chat_history?: Array<{ role: 'user' | 'assistant'; content: string }>
    page_snapshots?: Array<{
      key?: string
      capability_key?: string
      title?: string
      label?: string
      page_kind?: string
      widget?: string
      source_html?: string
    }>
    entry_source?: string
    industry_key?: string
    microsite_id?: string
    web_template_id?: string
    app_ui_id?: string
  },
  opts?: { token?: string | null; signal?: AbortSignal },
): Promise<{
  reply: string
  ops: ComposeEditOp[]
  source: string
  llm_configured: boolean
  intent_summary?: string
  matched?: Array<{ key: string; label?: string; score?: number }>
  pending_codegen_keys?: string[]
  codegen_job_id?: string
  quota?: {
    usage?: Record<string, number>
    remaining?: Record<string, number | null>
  }
}> {
  const res = await fetch('/api/v1/creation/compose-edit', {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok) {
    const raw = await res.text()
    let msg = raw || `compose-edit failed (${res.status})`
    try {
      const body = JSON.parse(raw) as { detail?: string | { message?: string } }
      if (typeof body.detail === 'string') msg = body.detail
      else if (body.detail && typeof body.detail === 'object' && body.detail.message) {
        msg = String(body.detail.message)
      }
    } catch {
      /* keep raw */
    }
    throw new Error(msg)
  }
  return res.json()
}

export type ComposeThinkingStep = {
  id: string
  label: string
  state: 'pending' | 'active' | 'done' | 'error'
}

export type ComposeEditResult = Awaited<ReturnType<typeof askComposeEdit>>

/** SSE 流式思考 → 最终 result；404 时回落同步 askComposeEdit */
export async function askComposeEditStream(
  body: Parameters<typeof askComposeEdit>[0],
  opts?: {
    token?: string | null
    signal?: AbortSignal
    onThinking?: (payload: {
      steps?: ComposeThinkingStep[]
      intent?: string
      label?: string
    }) => void
  },
): Promise<ComposeEditResult> {
  const res = await fetch('/api/v1/creation/compose-edit/stream', {
    method: 'POST',
    headers: {
      ...authHeaders(opts?.token),
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok || !res.body) {
    if (res.status === 404 || res.status === 405) {
      return askComposeEdit(body, opts)
    }
    const raw = await res.text()
    throw new Error(raw || `compose-edit stream failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: ComposeEditResult | null = null

  const flushEvent = (rawEvent: string) => {
    const lines = rawEvent.split(/\r?\n/)
    let event = 'message'
    const dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    if (!dataLines.length) return
    let data: Record<string, unknown>
    try {
      data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>
    } catch {
      return
    }
    if (event === 'thinking') {
      opts?.onThinking?.({
        steps: Array.isArray(data.steps) ? (data.steps as ComposeThinkingStep[]) : undefined,
        intent: typeof data.intent === 'string' ? data.intent : undefined,
        label: typeof data.label === 'string' ? data.label : undefined,
      })
    } else if (event === 'result') {
      result = data as unknown as ComposeEditResult
    } else if (event === 'error') {
      const msg = String(data.message || 'stream error')
      const err = new Error(msg) as Error & { status?: number }
      if (typeof data.status === 'number') err.status = data.status
      throw err
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep = buffer.indexOf('\n\n')
    while (sep >= 0) {
      const chunk = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      if (chunk.trim()) flushEvent(chunk)
      sep = buffer.indexOf('\n\n')
    }
  }
  if (buffer.trim()) flushEvent(buffer)
  if (result) return result
  return askComposeEdit(body, opts)
}

export async function fetchCodegenJob(
  jobId: string,
  opts?: { token?: string | null; signal?: AbortSignal },
): Promise<{
  id?: string
  status: string
  error?: string
  merged?: boolean
  unknown_keys?: string[]
  queued_at?: string
  started_at?: string
  finished_at?: string
  result?: {
    page_count?: number
    llm?: boolean
    routes?: string[]
    generated_pages?: Array<{
      key?: string
      title?: string
      route?: string
      summary?: string
      source_html?: string
      blocks?: Array<{ type?: string; text?: string; items?: string[] }>
      interactive?: Record<string, unknown>
    }>
  }
}> {
  const res = await fetch(`/api/v1/creation/codegen-jobs/${encodeURIComponent(jobId)}`, {
    headers: authHeaders(opts?.token),
    signal: opts?.signal,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `codegen job failed (${res.status})`)
  }
  return res.json()
}

export async function cancelCodegenJob(
  jobId: string,
  opts?: { token?: string | null; signal?: AbortSignal },
): Promise<{ id?: string; status: string; error?: string }> {
  const res = await fetch(`/api/v1/creation/codegen-jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
    headers: authHeaders(opts?.token),
    signal: opts?.signal,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `cancel codegen failed (${res.status})`)
  }
  return res.json()
}

export async function findActiveCodegenJob(
  appId: string,
  opts?: { token?: string | null; signal?: AbortSignal },
): Promise<{
  id?: string
  status?: string
  unknown_keys?: string[]
  app_id?: string
} | null> {
  const res = await fetch(
    `/api/v1/creation/codegen-jobs?app_id=${encodeURIComponent(appId)}`,
    { headers: authHeaders(opts?.token), signal: opts?.signal },
  )
  if (!res.ok) return null
  const data = (await res.json()) as { job?: Record<string, unknown> | null }
  const job = data.job
  if (!job || typeof job !== 'object') return null
  return {
    id: typeof job.id === 'string' ? job.id : undefined,
    status: typeof job.status === 'string' ? job.status : undefined,
    unknown_keys: Array.isArray(job.unknown_keys) ? (job.unknown_keys as string[]) : undefined,
    app_id: typeof job.app_id === 'string' ? job.app_id : undefined,
  }
}

export async function askFlowEdit(
  body: {
    instruction: string
    app_name?: string
    steps?: Array<{ id?: string; label?: string; note?: string; order?: number }>
    available_labels?: string[]
  },
  opts?: { token?: string | null; signal?: AbortSignal },
): Promise<{
  reply: string
  ops: FlowEditOp[]
  source: 'deepseek' | 'fallback'
  llm_configured: boolean
}> {
  const res = await fetch('/api/v1/creation/flow-edit', {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `flow-edit failed (${res.status})`)
  }
  return res.json()
}
