/** 模块能力目录 — 我的应用 · 模块数据流展示与添加 */

export interface ModuleCapability {
  icon: string
  label: string
  desc: string
  flowHint: string
  category: string
}

export const MODULE_CATALOG: ModuleCapability[] = [
  { icon: '💬', label: '智能问答', category: 'AI', desc: '多轮对话解答日常问题，可引用知识库', flowHint: '接收提问 · 理解意图 · 给出回答' },
  { icon: '✅', label: '审批流', category: '流程', desc: '自定义表单与工作流，请假报销等多级审批', flowHint: '生成工单 · 流转审批节点 · 归档留痕' },
  { icon: '📚', label: '知识库', category: '知识', desc: '上传制度/SOP 文档，语义检索与问答引用', flowHint: '检索 SOP / 制度文档 · 返回引用片段' },
  { icon: '📥', label: '待办中心', category: '流程', desc: '汇总待办已办，一键处理审批与任务', flowHint: '汇总待办 · 推送提醒 · 状态同步' },
  { icon: '📊', label: '数据看板', category: '数据', desc: 'KPI 卡片与图表，一屏看清关键数据', flowHint: '汇总指标 · 图表展示' },
  { icon: '📉', label: '销售漏斗', category: '数据', desc: '线索→商机→成交转化追踪', flowHint: '采集线索 · 阶段推进 · 漏斗统计' },
  { icon: '🔍', label: '智能问数', category: '数据', desc: '自然语言查数据，如「上月审批通过率」', flowHint: 'NL2SQL · 返回分析结果' },
  { icon: '🔔', label: '站内信', category: '通知', desc: '应用内消息通知，审批提醒与公告', flowHint: '通知相关人 · 状态同步' },
  { icon: '📱', label: '企微钉钉', category: '通知', desc: '推送至企业微信 / 钉钉 / 飞书', flowHint: '推送 IM 消息 · 待办卡片' },
  { icon: '🔐', label: '角色权限', category: '底座', desc: '按角色控制菜单与数据访问范围', flowHint: '鉴权校验 · 数据范围过滤' },
  { icon: '🌐', label: '多端门户', category: '底座', desc: '网页 + App 统一入口与品牌展示', flowHint: '统一登录 · 导航分发' },
  { icon: '📝', label: '合同盖章', category: '流程', desc: '合同起草、会签与电子签章', flowHint: '起草合同 · 会签审批 · 归档 PDF' },
]

const catalogMap = new Map(MODULE_CATALOG.map((m) => [m.label, m]))

export function getModuleCapability(label: string): ModuleCapability | null {
  return catalogMap.get(label.trim()) ?? null
}

export function defaultFlowHint(label: string): string {
  return getModuleCapability(label)?.flowHint ?? `数据流经 ${label}`
}

export function modulesAvailableToAdd(existingLabels: string[]): ModuleCapability[] {
  const have = new Set(existingLabels.map((l) => l.trim()))
  return MODULE_CATALOG.filter((m) => !have.has(m.label))
}
