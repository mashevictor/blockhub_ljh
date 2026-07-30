import type { AgentPick } from '../components/agentInputLogic'
import { moduleId } from '../components/agentInputLogic'
import { MODULES } from './constants'
import { CAPABILITIES_SHOWCASE, INDUSTRIES_SHOWCASE } from './showcase'
import type { SuggestValidation } from '../api/client'

export interface ScenarioRef {
  id: string
  name: string
  category: string
}

export interface SuggestItem {
  pick: AgentPick
  score: number
  reason: string
  iconKey?: string
  color?: string
}

const OFFICE_CATS = [
  '人事行政', '财务法务', '知识协同', '流程审批',
  '数据报表', '消息通知', 'IT与资产', '外部对接',
]

export const SUGGEST_KIND_ORDER = ['industry', 'office', 'capability', 'module', 'scenario', 'supplement'] as const

/** zh fallback — React UI should prefer `suggestKindLabel(t, kind)`. */
export const SUGGEST_KIND_LABEL: Record<string, string> = {
  industry: '推荐行业',
  office: '办公场景',
  capability: '平台能力',
  module: '功能模块',
  scenario: '业务场景',
  supplement: '扩展能力',
}

export const SUGGEST_KIND_I18N_KEY: Record<string, string> = {
  industry: 'home.suggest.kind.industry',
  office: 'home.suggest.kind.office',
  capability: 'home.suggest.kind.capability',
  module: 'home.suggest.kind.module',
  scenario: 'home.suggest.kind.scenario',
  supplement: 'home.suggest.kind.supplement',
}

export function suggestKindLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  kind: string,
): string {
  const key = SUGGEST_KIND_I18N_KEY[kind]
  if (!key) return SUGGEST_KIND_LABEL[kind] ?? kind
  const text = t(key)
  return text === key ? (SUGGEST_KIND_LABEL[kind] ?? kind) : text
}

const KEYWORD_HINTS: { words: string[]; pick: AgentPick; reason: string }[] = [
  { words: ['积木仓', 'blockhub', 'BlockHub'], pick: { type: 'capability', key: 'creation', label: '智能创建' }, reason: '识别为积木仓平台本体' },
  { words: ['积木仓', 'blockhub'], pick: { type: 'industry', key: 'office', label: '通用办公' }, reason: '积木仓核心办公场景库' },
  { words: ['积木仓', 'blockhub'], pick: { type: 'module', key: 'chat_qa', label: '智能问答' }, reason: '平台高频 AI 模块' },
  { words: ['制造', '工厂', '产线', '设备', '报修', 'SOP', '质检', 'MES'], pick: { type: 'industry', key: 'mfg', label: '传统制造' }, reason: '匹配制造相关描述' },
  { words: ['销售', 'CRM', '客户', '报价', '漏斗', '商机', '合同'], pick: { type: 'industry', key: 'sales', label: '销售行业' }, reason: '匹配销售相关描述' },
  { words: ['医院', '医疗', '患者', '排班', '合规', 'HIS', '导诊'], pick: { type: 'industry', key: 'med', label: '医疗健康' }, reason: '匹配医疗相关描述' },
  { words: ['游戏', '玩家', 'FAQ', '客服工单', '活动', '公会', '宠物'], pick: { type: 'industry', key: 'game', label: '游戏娱乐' }, reason: '匹配游戏相关描述' },
  { words: ['零售', '电商', '会员', '库存', '门店'], pick: { type: 'industry', key: 'retail', label: '零售电商' }, reason: '匹配零售相关描述' },
  { words: ['教育', '课程', '学生', '家校', '培训'], pick: { type: 'industry', key: 'edu', label: '教育培训' }, reason: '匹配教育相关描述' },
  { words: ['办公', '全员', '人事', '行政', '通用'], pick: { type: 'industry', key: 'office', label: '通用办公' }, reason: '匹配通用办公描述' },
  { words: ['审批', '请假', '报销', '流程', '待办'], pick: { type: 'module', key: 'approval_flow', label: '审批流' }, reason: '涉及流程审批' },
  { words: ['问答', '知识库', '制度', '文档', 'SOP'], pick: { type: 'module', key: 'kb_document', label: '知识库' }, reason: '需要知识沉淀' },
  { words: ['问答', '智能问', 'FAQ', '客服'], pick: { type: 'module', key: 'chat_qa', label: '智能问答' }, reason: '需要智能问答' },
  { words: ['看板', '报表', '数据', '统计', '漏斗'], pick: { type: 'module', key: 'chart_dashboard', label: '数据看板' }, reason: '需要数据可视化' },
  { words: ['闹钟', 'alarm', '定时', '准时', '每天', '重复', '日程', 'cron'], pick: { type: 'module', key: 'schedule_alarm', label: '定时闹钟' }, reason: '本地定时/重复提醒（App 端）' },
  { words: ['提醒', '通知', '推送', '消息'], pick: { type: 'module', key: 'notify_inapp', label: '站内信' }, reason: '需要消息触达' },
  { words: ['企微', '钉钉', '企业微信', '飞书'], pick: { type: 'module', key: 'notify_im', label: '企微钉钉' }, reason: '需要 IM 渠道推送' },
  { words: ['请假', '入职', '人事', '考勤'], pick: { type: 'office', key: '人事行政', label: '人事行政' }, reason: '人事场景' },
  { words: ['报销', '财务', '法务', '预算'], pick: { type: 'office', key: '财务法务', label: '财务法务' }, reason: '财务场景' },
  { words: ['协同', '文档', 'wiki', '制度'], pick: { type: 'office', key: '知识协同', label: '知识协同' }, reason: '知识协同场景' },
]

function metaForPick(pick: AgentPick): { iconKey?: string; color?: string } {
  if (pick.type === 'industry') {
    const ind = INDUSTRIES_SHOWCASE.find((i) => i.key === pick.key)
    return ind ? { iconKey: ind.iconKey, color: ind.color } : {}
  }
  if (pick.type === 'capability') {
    const cap = CAPABILITIES_SHOWCASE.find((c) => c.id === pick.key)
    return cap ? { iconKey: cap.iconKey, color: cap.color } : {}
  }
  if (pick.type === 'module' || pick.type === 'supplement') {
    const mod = MODULES.flatMap((g) => g.items).find((m) => m.key === pick.key)
    if (mod) {
      const iconKey = pick.key === 'schedule_alarm' ? 'notify' : pick.key.replace(/_/g, '-')
      return { iconKey, color: '#f59e0b' }
    }
    if (pick.key.startsWith('custom_')) {
      return { iconKey: 'workflow', color: '#8b5cf6' }
    }
  }
  return { iconKey: 'workflow', color: '#6366f1' }
}

function scoreText(q: string, words: string[]): number {
  let s = 0
  for (const w of words) {
    if (q.includes(w.toLowerCase()) || q.includes(w)) s += w.length >= 2 ? 2 : 1
  }
  return s
}

/** 从用户简单描述中推荐可勾选模块 */
export function suggestModulesFromText(
  text: string,
  scenarios: ScenarioRef[],
): SuggestItem[] {
  const q = text.trim()
  if (q.length < 2) return []

  const ql = q.toLowerCase()
  const seen = new Set<string>()
  const out: SuggestItem[] = []

  const push = (pick: AgentPick, score: number, reason: string) => {
    const id = moduleId(pick)
    if (seen.has(id)) return
    seen.add(id)
    out.push({ pick, score, reason, ...metaForPick(pick) })
  }

  for (const h of KEYWORD_HINTS) {
    const s = scoreText(ql, h.words)
    if (s > 0) push(h.pick, s, h.reason)
  }

  for (const ind of INDUSTRIES_SHOWCASE) {
    if (q.includes(ind.name) || q.includes(ind.key)) {
      push({ type: 'industry', key: ind.key, label: ind.name }, 5, '描述中含行业名')
    }
  }

  for (const cat of OFFICE_CATS) {
    if (q.includes(cat)) push({ type: 'office', key: cat, label: cat }, 4, '描述中含办公分类')
  }

  for (const s of scenarios) {
    if (q.includes(s.name) || s.name.split(/[/、]/).some((part) => part.length > 1 && q.includes(part))) {
      push({ type: 'scenario', key: s.id, label: s.name }, 6, `匹配场景「${s.category}」`)
    }
  }

  for (const g of MODULES) {
    for (const m of g.items) {
      if (q.includes(m.name)) {
        push({ type: 'module', key: m.key, label: m.name }, 4, g.cat)
      }
    }
  }

  for (const c of CAPABILITIES_SHOWCASE) {
    if (q.includes(c.name) || q.includes(c.desc.slice(0, 4))) {
      push({ type: 'capability', key: c.id, label: c.name }, 3, c.desc)
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 12)
}

export function hasStructuredPicks(picks: AgentPick[]): boolean {
  return picks.some((p) =>
    p.type === 'industry' || p.type === 'office' || p.type === 'capability'
    || p.type === 'module' || p.type === 'scenario' || p.type === 'supplement',
  )
}

/** 是否应把推荐结果写入输入框 chips（unclear 时仅接受高置信关键词，忽略 LLM 臆测） */
export function canAutoApplySuggestions(
  validation: { status?: string } | null | undefined,
  items: SuggestItem[],
): boolean {
  if (validation?.status === 'invalid' || items.length === 0) return false
  if (validation?.status === 'valid') return true
  if (validation?.status === 'unclear') {
    return items.some((s) => s.score >= 5.5 && !String(s.reason).includes('· AI'))
  }
  return items.some((s) => s.score >= 4)
}

/** 将简单描述 + 已匹配模块转为可生成的 prompt；无明确匹配时返回空 */
export function enhanceSimplePrompt(
  raw: string,
  picks: AgentPick[],
  validation?: SuggestValidation | null,
): string {
  const t = raw.trim().replace(/^>>\s*$/, '').trim()
  if (!t) return ''

  const summary = validation?.intent_summary?.trim()
  const lines: string[] = []

  if (summary) {
    lines.push(`>> 需求理解：${summary}`)
  } else if (hasStructuredPicks(picks)) {
    lines.push(`>> 需求理解：${t}`)
  } else {
    return ''
  }

  const industries = picks.filter((p) => p.type === 'industry')
  const scenes = picks.filter((p) => p.type === 'scenario')
  const offices = picks.filter((p) => p.type === 'office')
  const capabilities = picks.filter((p) => p.type === 'capability')
  const modules = picks.filter((p) => p.type === 'module' || p.type === 'supplement')

  if (industries.length) {
    lines.push(`>> 建议行业：${industries.map((p) => p.label).join('、')}`)
  }
  if (offices.length) {
    lines.push(`>> 办公侧重：${offices.map((p) => p.label).join('、')}`)
  }
  if (capabilities.length) {
    lines.push(`>> 平台能力：${capabilities.map((p) => p.label).join('、')}`)
  }
  if (modules.length) {
    lines.push(`>> 功能模块：${modules.map((p) => p.label).join('、')}`)
  }
  if (scenes.length) {
    lines.push(`>> 业务场景：${scenes.map((p) => p.label).join('、')}`)
  }

  lines.push('>> 请按以上组合生成网页和手机都能用的应用，打开即可使用')
  return lines.join('\n')
}

export function mapSuggestApiItem(it: { type: string; key: string; label: string }): AgentPick {
  if (it.type === 'industry') return { type: 'industry', key: it.key, label: it.label }
  if (it.type === 'office') return { type: 'office', key: it.key, label: it.label }
  if (it.type === 'capability') return { type: 'capability', key: it.key, label: it.label }
  if (it.type === 'scenario') return { type: 'scenario', key: it.key, label: it.label }
  if (it.type === 'supplement') return { type: 'supplement', key: it.key, label: it.label }
  return { type: 'module', key: it.key, label: it.label }
}

export function metaForSuggestItem(it: { type: string; key: string; label: string }) {
  return metaForPick(mapSuggestApiItem(it))
}

export function groupSuggestions(
  items: SuggestItem[],
  t?: (key: string, vars?: Record<string, string | number>) => string,
): { kind: string; label: string; items: SuggestItem[] }[] {
  const buckets = new Map<string, SuggestItem[]>()
  for (const s of items) {
    const k = s.pick.type === 'supplement' ? 'supplement' : s.pick.type
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(s)
  }
  return SUGGEST_KIND_ORDER
    .filter((k) => buckets.has(k))
    .map((k) => ({
      kind: k,
      label: t ? suggestKindLabel(t, k) : (SUGGEST_KIND_LABEL[k] ?? k),
      items: buckets.get(k)!,
    }))
}
