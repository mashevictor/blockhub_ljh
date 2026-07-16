import type { ComposeEditOp, ComposerPageSchema, FlowEditOp } from './types'

function authHeaders(token?: string | null): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export async function patchRuntimeSchema(
  appId: string,
  pageSchema: ComposerPageSchema,
  opts?: { token?: string | null; mergeMeta?: Record<string, unknown> },
): Promise<{ success: boolean; page_schema: ComposerPageSchema }> {
  const res = await fetch(`/api/v1/runtime/${appId}/schema`, {
    method: 'PATCH',
    headers: authHeaders(opts?.token),
    body: JSON.stringify({
      page_schema: pageSchema,
      merge_meta: opts?.mergeMeta ?? null,
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `schema PATCH failed (${res.status})`)
  }
  return res.json()
}

export async function patchRuntimeModules(
  appId: string,
  body: {
    capability_keys: string[]
    modules?: Array<Record<string, unknown>>
    rebuild_schema?: boolean
    menu_plan?: Array<Record<string, unknown>>
  },
  opts?: { token?: string | null },
): Promise<{
  success: boolean
  page_schema?: ComposerPageSchema
  capability_keys?: string[]
  build_manifest?: Record<string, unknown>
}> {
  const res = await fetch(`/api/v1/runtime/${appId}/modules`, {
    method: 'PATCH',
    headers: authHeaders(opts?.token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `modules PATCH failed (${res.status})`)
  }
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
