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

const CACHE_PREFIX = 'blockhub_flow_apis_'

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
      }),
      output_api: makeApi('GET', `${base}/egress/deliver`, '推送至员工端 / 通知渠道'),
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
      { module: modSlug, input: { text: '上游传入数据' } },
    ),
    output_api: makeApi(
      'GET',
      `${base}/modules/${modSlug}/output`,
      `输出处理结果 · ${node.note || node.label}`,
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

/** 拨通：先本地规则模拟立即可用，再异步尝试 DeepSeek 升级 */
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
    if (cached) return cached
  }

  const instant = buildFallbackFlowApis(opts.appKey, opts.steps)
  saveCachedFlowApis(opts.appKey, fingerprint, instant)

  const slug = appSlug(opts.appKey)
  void http
    .post<FlowApiResult>('/creation/flow-module-apis', {
      app_slug: slug,
      app_name: opts.appName,
      nodes: buildFlowApiNodeList(opts.steps),
    })
    .then((res) => {
      if (res.data?.nodes?.length) {
        saveCachedFlowApis(opts.appKey, fingerprint, res.data)
        opts.onUpgrade?.(res.data)
      }
    })
    .catch(() => {
      /* 保留本地 fallback */
    })

  return instant
}

export { FLOW_INGRESS_ID, FLOW_EGRESS_ID }
