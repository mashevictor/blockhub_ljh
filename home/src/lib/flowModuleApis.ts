import { api as http } from '../api/client'
import {
  buildFlowApiNodeList,
  FLOW_EGRESS_ID,
  FLOW_INGRESS_ID,
  flowStepsFingerprint,
  type ModuleFlowStep,
} from './plazaModuleFlow'

export interface FlowApiEndpoint {
  method: string
  path: string
  description: string
  sample_body?: Record<string, unknown>
}

export interface FlowApiNode {
  node_id: string
  label: string
  kind: string
  input_api: FlowApiEndpoint
  output_api: FlowApiEndpoint
}

export interface FlowApiResult {
  nodes: FlowApiNode[]
  source: 'deepseek' | 'fallback'
  llm_configured: boolean
}

const CACHE_PREFIX = 'blockhub_flow_apis_v2_'

/** 纠正大模型生成的不完整路径，避免测试 404 */
export function canonicalizeFlowApiPath(
  path: string,
  kind: string,
  side: 'input' | 'output',
  appKey: string,
): string {
  const slug = appSlug(appKey)
  const base = `/api/v1/runtime/${slug}`
  let p = (path || '').split('?')[0].trim()
  if (!p.startsWith('/')) p = `/${p}`
  p = p.replace(/\/+$/, '') || '/'
  p = p.replace(/^\/api\/v1\/runtime\/[^/]+/, base)

  if (kind === 'ingress') {
    if (p === `${base}/ingress` || p.endsWith('/ingress')) {
      return side === 'input' ? `${base}/ingress/webhook` : `${base}/ingress/dispatch`
    }
    const m = p.match(new RegExp(`^${base.replace(/\//g, '\\/')}/ingress/([a-zA-Z0-9_-]+)$`))
    if (m) {
      const a = m[1].toLowerCase()
      if (side === 'input' && ['output', 'out', 'dispatch'].includes(a)) return `${base}/ingress/webhook`
      if (side === 'output' && ['input', 'in', 'webhook'].includes(a)) return `${base}/ingress/dispatch`
      if (side === 'input' && ['input', 'in', 'receive'].includes(a)) return `${base}/ingress/webhook`
      if (side === 'output' && ['output', 'out'].includes(a)) return `${base}/ingress/dispatch`
      return p
    }
    return side === 'input' ? `${base}/ingress/webhook` : `${base}/ingress/dispatch`
  }
  if (kind === 'egress') {
    if (p === `${base}/egress` || p.endsWith('/egress')) {
      return side === 'input' ? `${base}/egress/collect` : `${base}/egress/deliver`
    }
    if (new RegExp(`^${base.replace(/\//g, '\\/')}/egress/[a-zA-Z0-9_-]+$`).test(p)) return p
    return side === 'input' ? `${base}/egress/collect` : `${base}/egress/deliver`
  }
  const mod = p.match(new RegExp(`^${base.replace(/\//g, '\\/')}/modules/([a-zA-Z0-9_-]+)(?:/(.*))?$`))
  if (mod) {
    return side === 'input'
      ? `${base}/modules/${mod[1]}/input`
      : `${base}/modules/${mod[1]}/output`
  }
  return p
}

function sanitizeFlowApiResult(appKey: string, result: FlowApiResult): FlowApiResult {
  return {
    ...result,
    nodes: result.nodes.map((n) => ({
      ...n,
      input_api: {
        ...n.input_api,
        path: canonicalizeFlowApiPath(n.input_api.path, n.kind, 'input', appKey),
      },
      output_api: {
        ...n.output_api,
        path: canonicalizeFlowApiPath(n.output_api.path, n.kind, 'output', appKey),
      },
    })),
  }
}

function cacheKey(appKey: string) {
  return `${CACHE_PREFIX}${appKey}`
}

function appSlug(appKey: string): string {
  return appKey.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48) || 'app'
}

function slugify(text: string): string {
  const ascii = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return ascii || 'node'
}

function makeApi(
  method: string,
  path: string,
  description: string,
  sample_body?: Record<string, unknown>,
): FlowApiEndpoint {
  return { method: method.toUpperCase(), path, description, sample_body }
}

function modulePathSlug(nodeId: string, label: string): string {
  const fromLabel = slugify(label)
  if (fromLabel !== 'node') return fromLabel
  const fromId = nodeId.replace(/[^a-z0-9_-]/gi, '-').toLowerCase().replace(/^-+|-+$/g, '')
  return fromId.slice(-32) || 'mod'
}

/** 与后端 flow_module_api._fallback_node_apis 对齐的本地规则模拟 */
function fallbackNodeApis(
  slug: string,
  node: { node_id: string; label: string; kind: string; note: string },
): FlowApiNode {
  const base = `/api/v1/runtime/${slug}`
  const modSlug = node.kind === 'module' ? modulePathSlug(node.node_id, node.label) : node.node_id
  if (node.kind === 'ingress') {
    return {
      node_id: node.node_id,
      label: node.label,
      kind: node.kind,
      input_api: makeApi('POST', `${base}/ingress/webhook`, '外部系统 / 用户提交业务请求', {
        event: 'business.request',
        payload: { query: '示例业务请求' },
      }),
      output_api: makeApi('POST', `${base}/ingress/dispatch`, '校验后分发至首模块', {
        routed_to: 'first_module',
        trace_id: 'demo-trace-001',
      }),
    }
  }
  if (node.kind === 'egress') {
    return {
      node_id: node.node_id,
      label: node.label,
      kind: node.kind,
      input_api: makeApi('POST', `${base}/egress/collect`, '汇聚各模块处理结果', {
        modules: ['module-a', 'module-b'],
        results: [{ module: 'module-a', ok: true }],
      }),
      output_api: makeApi('GET', `${base}/egress/deliver`, '推送到网页 / 消息通知', {
        channels: ['web', 'app'],
        delivered: true,
      }),
    }
  }
  return {
    node_id: node.node_id,
    label: node.label,
    kind: node.kind,
    input_api: makeApi(
      'POST',
      `${base}/modules/${modSlug}/input`,
      `接收上游数据 · ${node.note || node.label}`,
      { module: modSlug, input: { text: '上游传入数据' }, context: { user_id: 'u_demo' } },
    ),
    output_api: makeApi(
      'GET',
      `${base}/modules/${modSlug}/output`,
      `输出处理结果 · ${node.note || node.label}`,
      { module: modSlug, output: { answer: '示例输出' }, confidence: 0.92 },
    ),
  }
}

export function buildFallbackFlowApis(appKey: string, steps: ModuleFlowStep[]): FlowApiResult {
  const slug = appSlug(appKey)
  const nodes = buildFlowApiNodeList(steps).map((n) => fallbackNodeApis(slug, n))
  return { nodes, source: 'fallback', llm_configured: false }
}

export function loadCachedFlowApis(appKey: string, fingerprint: string): FlowApiResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(appKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { fingerprint: string; result: FlowApiResult }
    if (parsed.fingerprint !== fingerprint) return null
    return parsed.result
  } catch {
    return null
  }
}

export function saveCachedFlowApis(appKey: string, fingerprint: string, result: FlowApiResult) {
  try {
    localStorage.setItem(cacheKey(appKey), JSON.stringify({ fingerprint, result }))
  } catch {
    /* quota */
  }
}

export function apiNodeMap(result: FlowApiResult | null): Map<string, FlowApiNode> {
  const m = new Map<string, FlowApiNode>()
  if (!result) return m
  for (const n of result.nodes) m.set(n.node_id, n)
  return m
}

export function apiFullUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${window.location.origin}${path}`
}

export function buildApiCurl(endpoint: FlowApiEndpoint): string {
  const url = apiFullUrl(endpoint.path)
  if (endpoint.method === 'GET') return `curl -s "${url}"`
  const body = JSON.stringify(endpoint.sample_body ?? { demo: true })
  return `curl -s -X ${endpoint.method} "${url}" -H "Content-Type: application/json" -d '${body}'`
}

export interface ApiTestResult {
  ok: boolean
  status: number
  body: unknown
  ms: number
}

export async function testFlowApi(endpoint: FlowApiEndpoint): Promise<ApiTestResult> {
  const url = endpoint.path
  const started = performance.now()
  const init: RequestInit = {
    method: endpoint.method,
    headers: endpoint.method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
  }
  if (endpoint.method !== 'GET') {
    init.body = JSON.stringify(endpoint.sample_body ?? { demo: true })
  }
  const res = await fetch(url, init)
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = await res.text()
  }
  return {
    ok: res.ok,
    status: res.status,
    body,
    ms: Math.round(performance.now() - started),
  }
}

/** 拨通：优先等待 DeepSeek；失败再退回本地规则模拟 */
export async function dialFlowModuleApis(opts: {
  appKey: string
  appName: string
  steps: ModuleFlowStep[]
  force?: boolean
  onUpgrade?: (result: FlowApiResult) => void
}): Promise<FlowApiResult> {
  const fingerprint = flowStepsFingerprint(opts.steps)
  if (!opts.force) {
    const cached = loadCachedFlowApis(opts.appKey, fingerprint)
    // 有 DeepSeek 产物才用缓存；规则模拟缓存不当作最终答案
    if (cached && cached.source === 'deepseek') return cached
  }

  const slug = appSlug(opts.appKey)
  try {
    const res = await http.post<FlowApiResult>(
      '/creation/flow-module-apis',
      {
        app_slug: slug,
        app_name: opts.appName,
        nodes: buildFlowApiNodeList(opts.steps),
      },
      { timeout: 60000 },
    )
    if (res.data?.nodes?.length) {
      const cleaned = sanitizeFlowApiResult(opts.appKey, res.data)
      saveCachedFlowApis(opts.appKey, fingerprint, cleaned)
      opts.onUpgrade?.(cleaned)
      return cleaned
    }
  } catch {
    /* fall through */
  }

  const instant = sanitizeFlowApiResult(opts.appKey, buildFallbackFlowApis(opts.appKey, opts.steps))
  saveCachedFlowApis(opts.appKey, fingerprint, instant)
  return instant
}

export { FLOW_INGRESS_ID, FLOW_EGRESS_ID }
