import type { FlowEditOp, ModuleFlowPersist } from './types'

function defaultNote(label: string): string {
  const hints: Record<string, string> = {
    智能问答: '接收提问 · 解析意图',
    审批流: '生成工单 · 流转审批',
    知识库: '检索制度 / SOP',
    请假审批: '提交请假 · 审批流转',
    请假管理: '提交请假 · 审批流转',
    设备报修: '报修派工 · 状态回写',
    数据看板: '聚合指标 · 可视化',
    站内信: '通知相关人',
  }
  for (const [k, v] of Object.entries(hints)) {
    if (label.includes(k)) return v
  }
  return `处理「${label}」环节`
}

export function buildDefaultModuleFlow(appKey: string, labels: string[]): ModuleFlowPersist {
  return {
    appKey,
    updatedAt: new Date().toISOString(),
    steps: labels.map((label, i) => ({
      id: `${appKey}-step-${i}`,
      label,
      note: defaultNote(label),
      order: i,
    })),
  }
}

export function readModuleFlowFromSchema(
  schema: { meta?: Record<string, unknown>; appId?: string; menu?: Array<{ label: string }> } | null | undefined,
  fallbackLabels: string[],
  appKey = 'draft',
): ModuleFlowPersist {
  const raw = schema?.meta?.module_flow
  if (raw && typeof raw === 'object' && Array.isArray((raw as ModuleFlowPersist).steps)) {
    const flow = raw as ModuleFlowPersist
    if (flow.steps.length) {
      return { ...flow, appKey: flow.appKey || schema?.appId || appKey }
    }
  }
  const labels =
    fallbackLabels.length > 0
      ? fallbackLabels
      : (schema?.menu || []).map((m) => m.label).filter(Boolean)
  return buildDefaultModuleFlow(schema?.appId || appKey, labels.length ? labels : ['智能问答'])
}

function matchStep(
  steps: ModuleFlowPersist['steps'],
  label: string,
): ModuleFlowPersist['steps'][number] | undefined {
  const t = label.trim()
  return steps.find((s) => s.label === t) || steps.find((s) => s.label.includes(t) || t.includes(s.label))
}

export function applyFlowEditOps(flow: ModuleFlowPersist, ops: FlowEditOp[]): ModuleFlowPersist {
  let steps = [...flow.steps]
  for (const op of ops) {
    if (op.op === 'remove') {
      const hit = matchStep(steps, op.label)
      if (!hit) continue
      steps = steps.filter((s) => s.id !== hit.id)
      continue
    }
    if (op.op === 'rename') {
      const hit = matchStep(steps, op.from)
      if (!hit || !op.to?.trim()) continue
      steps = steps.map((s) => (s.id === hit.id ? { ...s, label: op.to.trim() } : s))
      continue
    }
    if (op.op === 'note') {
      const hit = matchStep(steps, op.label)
      if (!hit) continue
      steps = steps.map((s) => (s.id === hit.id ? { ...s, note: op.note } : s))
      continue
    }
    if (op.op === 'move') {
      const hit = matchStep(steps, op.label)
      if (!hit) continue
      const list = steps.filter((s) => s.id !== hit.id)
      const idx = Math.max(0, Math.min(list.length, op.index ?? 0))
      list.splice(idx, 0, hit)
      steps = list
      continue
    }
    if (op.op === 'add') {
      const label = (op.label || '').trim()
      if (!label) continue
      if (steps.some((s) => s.label === label)) continue
      const step = {
        id: `${flow.appKey}-step-${Date.now().toString(36)}`,
        label,
        note: op.note?.trim() || defaultNote(label),
        order: 0,
      }
      if (op.after?.trim()) {
        const after = matchStep(steps, op.after)
        if (after) {
          const idx = steps.findIndex((s) => s.id === after.id)
          steps = [...steps.slice(0, idx + 1), step, ...steps.slice(idx + 1)]
          continue
        }
      }
      steps = [...steps, step]
    }
  }
  return {
    ...flow,
    updatedAt: new Date().toISOString(),
    steps: steps.map((s, i) => ({ ...s, order: i })),
  }
}

export function moveFlowStepLocal(flow: ModuleFlowPersist, stepId: string, dir: -1 | 1): ModuleFlowPersist {
  const idx = flow.steps.findIndex((s) => s.id === stepId)
  if (idx < 0) return flow
  const next = idx + dir
  if (next < 0 || next >= flow.steps.length) return flow
  const steps = [...flow.steps]
  const [removed] = steps.splice(idx, 1)
  steps.splice(next, 0, removed)
  return {
    ...flow,
    updatedAt: new Date().toISOString(),
    steps: steps.map((s, i) => ({ ...s, order: i })),
  }
}

export function removeFlowStepLocal(flow: ModuleFlowPersist, stepId: string): ModuleFlowPersist {
  return {
    ...flow,
    updatedAt: new Date().toISOString(),
    steps: flow.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i })),
  }
}
