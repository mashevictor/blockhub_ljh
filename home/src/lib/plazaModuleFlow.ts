import { defaultFlowHint } from '../data/moduleCatalog'
import { getToken } from '../auth/storage'
import { patchRuntimeSchema } from '@capship/composer'
import { homeT } from '../i18n/homeT'

/** 单个模块在数据流中的节点 */
export interface ModuleFlowStep {
  id: string
  label: string
  note: string
  order: number
}

export interface AppModuleFlow {
  appKey: string
  steps: ModuleFlowStep[]
  updatedAt: string
}

const STORAGE_KEY = 'blockhub_plaza_module_flow'

const NOTE_KEY_BY_LABEL: Record<string, string> = {
  智能问答: 'home.plaza.flow.note.chat_qa',
  审批流: 'home.plaza.flow.note.approval',
  知识库: 'home.plaza.flow.note.kb',
  待办中心: 'home.plaza.flow.note.todo',
  数据看板: 'home.plaza.flow.note.dashboard',
  智能问数: 'home.plaza.flow.note.nl_query',
  站内信: 'home.plaza.flow.note.notify',
  企微钉钉: 'home.plaza.flow.note.im',
}

function defaultNote(label: string): string {
  const key = NOTE_KEY_BY_LABEL[label]
  if (key) return homeT(key)
  return defaultFlowHint(label)
}

export function buildDefaultFlow(appKey: string, moduleLabels: string[]): AppModuleFlow {
  const steps = moduleLabels.map((label, i) => ({
    id: `${appKey}-step-${i}`,
    label,
    note: defaultNote(label),
    order: i,
  }))
  return { appKey, steps, updatedAt: new Date().toISOString() }
}

function loadAll(): Record<string, AppModuleFlow> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, AppModuleFlow>
  } catch {
    return {}
  }
}

function saveAll(map: Record<string, AppModuleFlow>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

/** 本地缓存读取（兼容离线）；展示优先水合 Runtime schema，广场侧不写回 DB */
export function loadModuleFlow(appKey: string, moduleLabels: string[]): AppModuleFlow {
  const stored = loadAll()[appKey]
  if (stored?.steps?.length) return stored
  return buildDefaultFlow(appKey, moduleLabels)
}

/**
 * 仅写 localStorage，供本地预览缓存。
 * 广场「我的应用」为只读概览，禁止通过此路径 PATCH 真 Runtime schema。
 * Runtime 对话改页才走正式草稿/审批流。
 */
export function saveModuleFlow(flow: AppModuleFlow): AppModuleFlow {
  const next = { ...flow, updatedAt: new Date().toISOString() }
  const map = loadAll()
  map[flow.appKey] = next
  saveAll(map)
  return next
}

/** 从 Runtime schema 水合流程（优先于 localStorage） */
export async function hydrateModuleFlowFromRuntime(
  appKey: string,
  moduleLabels: string[],
): Promise<AppModuleFlow> {
  try {
    const res = await fetch(`/api/v1/runtime/${appKey}/schema`)
    if (res.ok) {
      const data = (await res.json()) as {
        page_schema?: { meta?: { module_flow?: AppModuleFlow } }
      }
      const remote = data.page_schema?.meta?.module_flow
      if (remote?.steps?.length) {
        const next = { ...remote, appKey, updatedAt: remote.updatedAt || new Date().toISOString() }
        const map = loadAll()
        map[appKey] = next
        saveAll(map)
        return next
      }
    }
  } catch {
    /* fall through */
  }
  return loadModuleFlow(appKey, moduleLabels)
}

/** 将流程写入 page_schema.meta.module_flow（仅 Runtime 正式改页路径可调用；广场禁止） */
export async function persistModuleFlowToRuntime(flow: AppModuleFlow): Promise<void> {
  const token = getToken()
  if (!token || !flow.appKey) return
  const res = await fetch(`/api/v1/runtime/${flow.appKey}/schema`)
  if (!res.ok) return
  const data = (await res.json()) as { page_schema?: Record<string, unknown> }
  const schema = data.page_schema
  if (!schema || typeof schema !== 'object') return
  const meta = { ...((schema.meta as Record<string, unknown>) || {}), module_flow: flow }
  const nextSchema = { ...schema, meta }
  await patchRuntimeSchema(flow.appKey, nextSchema as never, {
    token,
    mergeMeta: { module_flow: flow },
  })
}

export function addFlowStep(flow: AppModuleFlow, label: string, note?: string): AppModuleFlow {
  const order = flow.steps.length
  const step: ModuleFlowStep = {
    id: `${flow.appKey}-step-${Date.now()}`,
    label: label.trim(),
    note: note?.trim() || defaultNote(label.trim()),
    order,
  }
  return saveModuleFlow({ ...flow, steps: [...flow.steps, step] })
}

/** 在指定节点之后插入模块（用于「> 添加模块」） */
export function insertFlowStepAfter(
  flow: AppModuleFlow,
  afterStepId: string | null,
  label: string,
  note?: string,
): AppModuleFlow {
  const trimmed = label.trim()
  const step: ModuleFlowStep = {
    id: `${flow.appKey}-step-${Date.now()}`,
    label: trimmed,
    note: note?.trim() || defaultNote(trimmed),
    order: 0,
  }
  if (afterStepId === FLOW_INGRESS_ID) {
    const steps = [step, ...flow.steps]
    return saveModuleFlow({ ...flow, steps: steps.map((s, i) => ({ ...s, order: i })) })
  }
  if (!afterStepId) {
    return saveModuleFlow({ ...flow, steps: [...flow.steps, step].map((s, i) => ({ ...s, order: i })) })
  }
  const idx = flow.steps.findIndex((s) => s.id === afterStepId)
  if (idx < 0) return addFlowStep(flow, trimmed, note)
  const steps = [...flow.steps]
  steps.splice(idx + 1, 0, step)
  return saveModuleFlow({ ...flow, steps: steps.map((s, i) => ({ ...s, order: i })) })
}

export function updateFlowStep(flow: AppModuleFlow, stepId: string, patch: Partial<Pick<ModuleFlowStep, 'label' | 'note'>>): AppModuleFlow {
  const steps = flow.steps.map((s) =>
    s.id === stepId ? { ...s, ...patch } : s,
  )
  return saveModuleFlow({ ...flow, steps })
}

export function removeFlowStep(flow: AppModuleFlow, stepId: string): AppModuleFlow {
  const steps = flow.steps
    .filter((s) => s.id !== stepId)
    .map((s, i) => ({ ...s, order: i }))
  return saveModuleFlow({ ...flow, steps })
}

export function moveFlowStep(flow: AppModuleFlow, stepId: string, dir: -1 | 1): AppModuleFlow {
  const idx = flow.steps.findIndex((s) => s.id === stepId)
  if (idx < 0) return flow
  const next = idx + dir
  if (next < 0 || next >= flow.steps.length) return flow
  return reorderFlowSteps(flow, idx, next)
}

/** 拖拽排序：将 fromIndex 位置的模块移到 toIndex */
export function reorderFlowSteps(flow: AppModuleFlow, fromIndex: number, toIndex: number): AppModuleFlow {
  if (fromIndex === toIndex) return flow
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= flow.steps.length || toIndex >= flow.steps.length) {
    return flow
  }
  const steps = [...flow.steps]
  const [removed] = steps.splice(fromIndex, 1)
  steps.splice(toIndex, 0, removed)
  return saveModuleFlow({
    ...flow,
    steps: steps.map((s, i) => ({ ...s, order: i })),
  })
}

/** 双轨：前半输入链，后半输出链 */
export function splitFlowRails(steps: ModuleFlowStep[]): {
  railIn: ModuleFlowStep[]
  railOut: ModuleFlowStep[]
} {
  if (steps.length <= 1) return { railIn: steps, railOut: [] }
  const mid = Math.ceil(steps.length / 2)
  return { railIn: steps.slice(0, mid), railOut: steps.slice(mid) }
}

export interface FlowRailTag {
  stepId: string
  label: string
  note: string
  durationSec: number
  delaySec: number
}

export function buildFlowRailTags(steps: ModuleFlowStep[], laneIndex: 0 | 1): FlowRailTag[] {
  const base = laneIndex === 0 ? 16 : 20
  return steps.map((step, i) => ({
    stepId: step.id,
    label: step.label,
    note: step.note,
    durationSec: base + (i % 3) * 2,
    delaySec: -(i * 4),
  }))
}

export function flowStepLabel(step: ModuleFlowStep): string {
  return `${step.label} · ${step.note}`
}

/** 数据流虚拟节点 ID */
export const FLOW_INGRESS_ID = '__ingress__'
export const FLOW_EGRESS_ID = '__egress__'

export function buildFlowApiNodeList(steps: ModuleFlowStep[]) {
  const nodes: Array<{ node_id: string; label: string; kind: string; note: string }> = [
    {
      node_id: FLOW_INGRESS_ID,
      label: homeT('home.plaza.flow.ingress_label'),
      kind: 'ingress',
      note: homeT('home.plaza.flow.ingress_note'),
    },
  ]
  for (const s of steps) {
    nodes.push({ node_id: s.id, label: s.label, kind: 'module', note: s.note })
  }
  nodes.push({
    node_id: FLOW_EGRESS_ID,
    label: homeT('home.plaza.cmd.output'),
    kind: 'egress',
    note: homeT('home.plaza.flow.egress_note'),
  })
  return nodes
}

export function flowStepsFingerprint(steps: ModuleFlowStep[]): string {
  return steps.map((s) => `${s.label}:${s.note}`).join('|')
}
