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
): Promise<{ success: boolean; change: SchemaChangeItem; schema_rev: number }> {
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
  },
  opts?: { token?: string | null; signal?: AbortSignal },
): Promise<{
  reply: string
  ops: ComposeEditOp[]
  source: 'deepseek' | 'fallback'
  llm_configured: boolean
  intent_summary?: string
  matched?: Array<{ key: string; label?: string; score?: number }>
  pending_codegen_keys?: string[]
  codegen_job_id?: string
}> {
  const res = await fetch('/api/v1/creation/compose-edit', {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `compose-edit failed (${res.status})`)
  }
  return res.json()
}

export async function fetchCodegenJob(
  jobId: string,
  opts?: { token?: string | null; signal?: AbortSignal },
): Promise<{
  id?: string
  status: string
  error?: string
  merged?: boolean
  result?: {
    page_count?: number
    llm?: boolean
    routes?: string[]
    generated_pages?: Array<{
      key?: string
      title?: string
      route?: string
      summary?: string
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
