const AGENT_LABELS: Record<string, string> = {
  chat_qa: '智能问答',
  approval: '审批流',
  kb: '知识库',
  report: '数据报表',
  notify: '消息通知',
  integration: '系统集成',
  form: '表单',
  chart: '图表看板',
  list: '列表查询',
}

/** 将 seed 中的 agent 组合串转为可读文案，如 approval+kb+report → 审批流 · 知识库 · 数据报表 */
export function formatAgentLabel(raw: string): string {
  if (!raw) return '通用能力'
  const parts = raw.split(/[+/,]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return raw
  return parts.map((p) => AGENT_LABELS[p] ?? p.replace(/_/g, ' ')).join(' · ')
}
