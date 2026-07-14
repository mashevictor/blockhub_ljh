import type { AgentPick } from '../components/agentInputLogic'
import { moduleId, pickToModule, type PromptModule } from '../components/agentInputLogic'
import { MODULES } from './constants'
import { CAPABILITIES_SHOWCASE, INDUSTRIES_SHOWCASE, resolveIndustryApiKey } from './showcase'

/**
 * 可选底座能力（默认不再静默注入 —— 选型即交付）。
 * 仅当 resolveAppBundle({ skipBaseline: false }) 时追加。
 */
export const BASELINE_PICKS: AgentPick[] = [
  { type: 'capability', key: 'portal', label: '多端门户' },
  { type: 'module', key: 'chat_qa', label: '智能问答' },
  { type: 'module', key: 'approval_flow', label: '审批流' },
  { type: 'module', key: 'kb_document', label: '知识库' },
  { type: 'module', key: 'notify_inapp', label: '站内信' },
  { type: 'module', key: 'rbac_page', label: '角色权限' },
]

/** 按行业追加的推荐模块 */
export const INDUSTRY_EXTRA: Record<string, AgentPick[]> = {
  mfg: [{ type: 'module', key: 'chart_dashboard', label: '数据看板' }],
  sales: [{ type: 'module', key: 'chart_funnel', label: '销售漏斗' }],
  med: [{ type: 'module', key: 'chat_qa', label: '智能问答' }],
  game: [{ type: 'module', key: 'notify_inapp', label: '站内信' }],
  office: [{ type: 'module', key: 'approval_inbox', label: '待办中心' }],
}

export interface ChipTemplate {
  text: string
  prompt: string
  picks: AgentPick[]
  scenarioNames?: string[]
}

/** 方式 E：快捷示例 → 拆成 modules + 描述文字 */
export const CHIP_TEMPLATES: ChipTemplate[] = [
  {
    text: '制造业设备报修 + SOP 问答',
    prompt: '制造业现场设备报修与 SOP 工艺问答，手机提交、主管审批。',
    picks: [
      { type: 'industry', key: 'mfg', label: '传统制造' },
      { type: 'scenario', key: 'chip-mfg-repair', label: '设备报修' },
      { type: 'scenario', key: 'chip-mfg-sop', label: 'SOP/工艺问答' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    scenarioNames: ['设备报修', 'SOP/工艺问答'],
  },
  {
    text: '销售团队 CRM + 审批 + 漏斗看板',
    prompt: '销售团队客户跟进、报价审批与销售漏斗看板一体化。',
    picks: [
      { type: 'industry', key: 'sales', label: '销售行业' },
      { type: 'module', key: 'chart_funnel', label: '销售漏斗' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
  },
  {
    text: '医院内部制度问答 + 排班申请',
    prompt: '医院内部制度合规问答与排班调班在线申请。',
    picks: [
      { type: 'industry', key: 'med', label: '医疗健康' },
      { type: 'scenario', key: 'chip-med-kb', label: '内部制度/合规问答' },
      { type: 'scenario', key: 'chip-med-shift', label: '排班/调班申请' },
    ],
    scenarioNames: ['内部制度/合规问答', '排班/调班申请'],
  },
  {
    text: '游戏玩家 FAQ + 客服工单',
    prompt: '游戏玩家 FAQ 攻略与客服工单处理，支持活动规则查询。',
    picks: [
      { type: 'industry', key: 'game', label: '游戏娱乐' },
      { type: 'scenario', key: 'chip-game-faq', label: '玩家FAQ/攻略' },
      { type: 'scenario', key: 'chip-game-ticket', label: '客服工单' },
    ],
    scenarioNames: ['玩家FAQ/攻略', '客服工单'],
  },
  {
    text: '全员请假报销 + 知识库 + 企微通知',
    prompt: '全员请假报销审批、制度知识库与企微消息通知。',
    picks: [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'office', key: '人事行政', label: '人事行政' },
      { type: 'office', key: '流程审批', label: '流程审批' },
      { type: 'module', key: 'kb_document', label: '知识库' },
      { type: 'module', key: 'notify_im', label: '企微钉钉' },
    ],
    scenarioNames: ['请假申请', '报销审批', '制度文档库'],
  },
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
  if (pick.type === 'module') {
    for (const g of MODULES) {
      const m = g.items.find((x) => x.key === pick.key)
      if (m) return { iconKey: 'workflow', color: '#6366f1' }
    }
  }
  return { iconKey: 'office', color: '#6366f1' }
}

export function pickWithMeta(pick: AgentPick): PromptModule {
  return { ...pickToModule(pick, metaForPick(pick)), source: 'user' as const }
}

export interface ResolvedAppBundle {
  userModules: PromptModule[]
  autoModules: PromptModule[]
  /** 用户顺序优先，其后系统补齐 */
  allModules: PromptModule[]
  promptText: string
  scenarioIds: string[]
  scenarioNames: string[]
  industryKey: string
  appName: string
}

export interface ResolveOptions {
  userModules: PromptModule[]
  promptText: string
  scenarioIds: string[]
  catalogNames: Map<string, string>
  /** 发布前 API/DeepSeek 推荐模块 */
  suggestedModules?: PromptModule[]
  /** 为 true 时不自动套办公底座（待办/审批/知识库等） */
  skipBaseline?: boolean
  /** 纯文字描述时的场景/应用名摘要 */
  intentLabel?: string
}

export function resolveAppBundle(opts: ResolveOptions): ResolvedAppBundle {
  const {
    userModules,
    promptText,
    scenarioIds,
    catalogNames,
    suggestedModules = [],
    skipBaseline = true,
    intentLabel = '',
  } = opts

  const userOrdered = userModules.map((m, i) => ({ ...m, order: i, source: m.source ?? 'user' as const }))
  const seen = new Set(userOrdered.map((m) => m.id))

  const suggestedOrdered: PromptModule[] = []
  for (const m of suggestedModules) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    suggestedOrdered.push({
      ...m,
      source: 'suggest' as const,
      order: userOrdered.length + suggestedOrdered.length,
    })
  }

  const industryKey = (() => {
    const ind = [...userOrdered, ...suggestedOrdered].find((m) => m.type === 'industry')
    if (ind) return resolveIndustryApiKey(ind.key)
    return 'office'
  })()

  const autoModules: PromptModule[] = []
  if (!skipBaseline) {
    const extras = INDUSTRY_EXTRA[industryKey] ?? INDUSTRY_EXTRA.office ?? []
    const autoCandidates = [...extras, ...BASELINE_PICKS]
    for (const pick of autoCandidates) {
      const id = moduleId(pick)
      if (seen.has(id)) continue
      seen.add(id)
      autoModules.push({
        ...pickToModule(pick, metaForPick(pick)),
        source: 'auto',
        order: userOrdered.length + suggestedOrdered.length + autoModules.length,
      })
    }
  }

  const allModules = [...userOrdered, ...suggestedOrdered, ...autoModules]

  const scenarioNames: string[] = []
  for (const m of [...userOrdered, ...suggestedOrdered]) {
    if (m.type === 'scenario') scenarioNames.push(m.label)
  }
  for (const id of scenarioIds) {
    const name = catalogNames.get(id)
    if (name && !scenarioNames.includes(name)) scenarioNames.push(name)
  }
  if (scenarioNames.length === 0 && intentLabel.trim()) {
    scenarioNames.push(intentLabel.trim().slice(0, 32))
  } else if (scenarioNames.length === 0) {
    scenarioNames.push('自定义应用')
  }

  const promptTextBuilt = buildPromptText(
    [...userOrdered, ...suggestedOrdered],
    autoModules,
    promptText,
  )

  const appName = (() => {
    const userMods = userOrdered
    const scenarios = userMods.filter((m) => m.type === 'scenario')
    const funcs = userMods.filter((m) => m.type === 'module' || m.type === 'capability')
    const industry = userMods.find((m) => m.type === 'industry')
    const intentName = intentLabel.trim().replace(/[，。！？、,.!?；;：:\s]+/g, '').slice(0, 14)

    if (scenarios.length === 1) return scenarios[0].label
    if (scenarios.length > 1) return `${scenarios[0].label}·${scenarios[1].label}`
    if (funcs.length >= 2) return `${funcs[0].label}${funcs[1].label}`
    if (funcs.length === 1 && industry) return `${industry.label}·${funcs[0].label}`
    if (funcs.length === 1) return funcs[0].label
    if (intentName.length >= 2) return intentName
    if (industry) return `${industry.label}助手`
    const sugScenario = suggestedOrdered.find((m) => m.type === 'scenario')
    if (sugScenario) return sugScenario.label
    const sugFunc = suggestedOrdered.find((m) => m.type === 'module' || m.type === 'capability')
    if (sugFunc) return sugFunc.label
    return promptTextBuilt.slice(0, 16) || '我的应用'
  })()

  return {
    userModules: userOrdered,
    autoModules,
    allModules,
    promptText: promptTextBuilt,
    scenarioIds,
    scenarioNames,
    industryKey,
    appName,
  }
}

function groupLabel(type: PromptModule['type']): string {
  if (type === 'industry') return '（行业）'
  if (type === 'office') return '（办公分类）'
  if (type === 'scenario') return '（场景）'
  if (type === 'capability') return '（能力）'
  if (type === 'module') return '（模块）'
  return ''
}

/** 根据已选模块生成输入框内的逻辑描述（实时展示） */
export function composeLogicalPrompt(modules: PromptModule[]): string {
  const user = modules.filter((m) => m.source !== 'auto')
  if (!user.length) return ''

  const industries = user.filter((m) => m.type === 'industry')
  const offices = user.filter((m) => m.type === 'office')
  const scenarios = user.filter((m) => m.type === 'scenario')
  const caps = user.filter((m) => m.type === 'capability')
  const mods = user.filter((m) => m.type === 'module')

  const lines: string[] = []

  if (industries.length === 1) {
    const ind = INDUSTRIES_SHOWCASE.find((i) => i.key === industries[0].key)
    lines.push(`我们是「${industries[0].label}」行业${ind ? `，${ind.desc}` : ''}。`)
  } else if (industries.length > 1) {
    lines.push(
      `我们涉及 ${industries.length} 个行业：${industries.map((i) => i.label).join('、')}，需要一套可跨行业复用的智能应用。`,
    )
  } else {
    lines.push('需要搭建一套企业智能应用。')
  }

  if (offices.length > 0) {
    lines.push(`办公侧重点关注：${offices.map((o) => o.label).join('、')}。`)
  }

  if (scenarios.length > 0) {
    lines.push(`核心业务场景：${scenarios.map((s) => s.label).join('、')}。`)
  }

  const funcs = [...caps, ...mods]
  if (funcs.length > 0) {
    lines.push(`必备能力模块：${funcs.map((f) => f.label).join('、')}。`)
  }

  if (industries.length > 0 && scenarios.length === 0 && funcs.length === 0) {
    lines.push('请基于上述行业视角，组合典型场景，生成可直接使用的应用。')
  } else {
    lines.push('请按以上组合生成网页和手机都能用的应用，打开即可使用。')
  }

  return lines.join('\n')
}

export function splitPromptText(full: string, modules: PromptModule[]): { base: string; suffix: string } {
  const base = composeLogicalPrompt(modules)
  if (!base) return { base: '', suffix: full.trim().replace(/^>>$/, '').trim() }
  if (full.startsWith(base)) {
    return { base, suffix: full.slice(base.length).replace(/^\n+/, '').trim() }
  }
  return { base: '', suffix: full.trim() }
}

export function mergePromptText(base: string, suffix: string): string {
  if (!base) return suffix
  if (!suffix.trim()) return base
  return `${base}\n\n${suffix.trim()}`
}

function buildPromptText(
  userModules: PromptModule[],
  autoModules: PromptModule[],
  raw: string,
): string {
  const { suffix } = splitPromptText(raw, userModules)
  const logical = composeLogicalPrompt(userModules)
  const body = mergePromptText(logical, suffix)

  if (body.trim()) {
    if (autoModules.length === 0) return body
    return `${body}\n\n（系统已自动补齐：${autoModules.map((m) => m.label).join('、')}）`
  }

  if (userModules.length === 0 && autoModules.length > 0) {
    return `生成标准企业应用，系统自动包含：${autoModules.map((m) => m.label).join('、')}。`
  }

  const lines: string[] = ['需要搭建一套企业智能应用，按优先级包含：']
  userModules.forEach((m, i) => {
    lines.push(`${i + 1}. ${m.label}${groupLabel(m.type)}`)
  })
  if (autoModules.length) {
    lines.push('\n系统自动补齐基础能力：')
    lines.push(autoModules.map((m) => m.label).join('、'))
  }
  lines.push('\n请组合为可发布的网页/App 双端应用。')
  return lines.join('\n')
}

export function findChipTemplate(text: string): ChipTemplate | undefined {
  return CHIP_TEMPLATES.find((t) => t.text === text)
}
