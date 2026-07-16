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
  },
): Promise<{
  success: boolean
  page_schema: ComposerPageSchema
  schema_rev: number
  schema_editor_name?: string
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
    }),
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

export async function fetchIndustryAssembly(packKey: string, sceneNames?: string[]) {
  const q = sceneNames?.length ? `?scenes=${encodeURIComponent(sceneNames.join(','))}` : ''
  const res = await fetch(`/api/v1/creation/industry/${packKey}/assembly${q}`)
  if (!res.ok) throw new Error('industry assembly failed')
  return res.json() as Promise<{
    success: boolean
    assembly: {
      capability_keys: string[]
      scenario_names: string[]
      menu_plan: Array<Record<string, string>>
      groups: Array<{ category: string; scenes: string[] }>
      scene_count: number
      pack_name: string
    }
  }>
}

export async function askComposeEdit(
  body: {
    instruction: string
    app_name?: string
    menu?: Array<{ key?: string; label?: string; capability_key?: string; category?: string }>
    capability_keys?: string[]
  },
  opts?: { token?: string | null },
): Promise<{
  reply: string
  ops: ComposeEditOp[]
  source: 'deepseek' | 'fallback'
  llm_configured: boolean
  intent_summary?: string
  matched?: Array<{ key: string; label?: string; score?: number }>
}> {
  const res = await fetch('/api/v1/creation/compose-edit', {
    method: 'POST',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `compose-edit failed (${res.status})`)
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
  opts?: { token?: string | null },
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
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `flow-edit failed (${res.status})`)
  }
  return res.json()
}
