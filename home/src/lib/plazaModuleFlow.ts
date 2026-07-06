import { defaultFlowHint } from '../data/moduleCatalog'

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

const DEFAULT_NOTES: Record<string, string> = {
  智能问答: '接收用户提问 · 解析意图',
  审批流: '生成工单 · 流转审批节点',
  知识库: '检索 SOP / 制度文档',
  待办中心: '汇总待办 · 推送提醒',
  数据看板: '聚合指标 · 可视化输出',
  智能问数: 'NL2SQL · 返回分析结果',
  站内信: '通知相关人 · 状态同步',
  企微钉钉: '推送 IM 消息',
}

function defaultNote(label: string): string {
  return DEFAULT_NOTES[label] ?? defaultFlowHint(label)
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

/** 读取应用模块流；若无则按 modules 生成默认 */
export function loadModuleFlow(appKey: string, moduleLabels: string[]): AppModuleFlow {
  const stored = loadAll()[appKey]
  if (stored?.steps?.length) return stored
  return buildDefaultFlow(appKey, moduleLabels)
}

export function saveModuleFlow(flow: AppModuleFlow): AppModuleFlow {
  const next = { ...flow, updatedAt: new Date().toISOString() }
  const map = loadAll()
  map[flow.appKey] = next
  saveAll(map)
  return next
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
    { node_id: FLOW_INGRESS_ID, label: '业务输入', kind: 'ingress', note: '用户 / 业务请求进入' },
  ]
  for (const s of steps) {
    nodes.push({ node_id: s.id, label: s.label, kind: 'module', note: s.note })
  }
  nodes.push({ node_id: FLOW_EGRESS_ID, label: '触达输出', kind: 'egress', note: '员工 / 管理者可见' })
  return nodes
}

export function flowStepsFingerprint(steps: ModuleFlowStep[]): string {
  return steps.map((s) => `${s.label}:${s.note}`).join('|')
}
