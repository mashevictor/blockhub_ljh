import type { PromptModule } from '../components/agentInputLogic'
import { MODULE_ICON_KEYS } from './iconPalette'
import type { PublishedModuleItem } from './constants'
import { BASELINE_PICKS, INDUSTRY_EXTRA, type ResolvedAppBundle } from './appAssembly'
import { INDUSTRIES_SHOWCASE } from './showcase'

const PHONE_SKIP_KEYS = new Set(['portal', 'rbac_page'])

function iconForModuleKey(key: string, fallback = 'creation'): string {
  return MODULE_ICON_KEYS[key] ?? fallback
}

function promptModuleToPublished(m: PromptModule): PublishedModuleItem | null {
  if (m.type === 'action') return null
  let iconKey = m.iconKey ?? 'office'
  if (m.type === 'module' || m.type === 'capability' || m.type === 'supplement') {
    iconKey = iconForModuleKey(m.key, m.iconKey ?? 'creation')
  } else if (m.type === 'scenario') {
    iconKey = 'workflow'
  } else if (m.type === 'industry') {
    const ind = INDUSTRIES_SHOWCASE.find((i) => i.key === m.key)
    iconKey = ind?.iconKey ?? 'office'
  } else if (m.type === 'office') {
    iconKey = 'office'
  }
  return {
    key: m.key,
    label: m.label,
    iconKey,
    kind: m.type === 'module' || m.type === 'supplement' ? 'module' : m.type,
    source: m.source,
  }
}

/** 从 Prompt 流程的 resolveAppBundle 结果构建发布展示项 */
export function buildPublishedModulesFromBundle(bundle: ResolvedAppBundle): PublishedModuleItem[] {
  const items: PublishedModuleItem[] = []
  const seen = new Set<string>()
  for (const m of bundle.allModules) {
    const item = promptModuleToPublished(m)
    if (!item || seen.has(item.key)) continue
    seen.add(item.key)
    items.push(item)
  }
  return items
}

/** 与 backend schema_templates 对齐：场景名 → 真实能力（选型即交付，不灌底座审批流） */
const SCENARIO_CAPABILITY_MAP: Array<{ match: string[]; caps: Array<{ key: string; label: string }> }> = [
  { match: ['设备报修', '报修', 'IT报障'], caps: [
    { key: 'device_repair', label: '设备报修' },
    { key: 'notify_im', label: '企微钉钉飞书' },
    { key: 'chat_qa', label: '智能问答' },
  ]},
  { match: ['SOP', '工艺', '作业指导', 'BOM', '质检SOP'], caps: [
    { key: 'quality_inspect', label: '质检SOP' },
    { key: 'notify_im', label: '企微钉钉飞书' },
    { key: 'chat_qa', label: '智能问答' },
  ]},
  { match: ['生产日报', 'OEE', '产量'], caps: [
    { key: 'chart_dashboard', label: '数据看板' },
    { key: 'data_nl_query', label: '智能问数' },
  ]},
  { match: ['质检', '安环', '隐患'], caps: [
    { key: 'quality_inspect', label: '质检SOP' },
    { key: 'notify_im', label: '企微钉钉飞书' },
  ]},
  { match: ['库存', '盘点', 'SKU', '货位', '补货'], caps: [
    { key: 'inventory_count', label: '库存盘点' },
    { key: 'notify_im', label: '企微钉钉飞书' },
  ]},
  { match: ['会员营销', '会员积分', '会员管理', '促销活动', '券码', '积分兑换'], caps: [
    { key: 'member_loyalty', label: '会员营销' },
    { key: 'notify_im', label: '企微钉钉飞书' },
  ]},
  { match: ['医疗导诊', '智能导诊', '就医指南', '导诊', '预问诊', '科室导航', '症状初筛'], caps: [
    { key: 'med_triage', label: '医疗导诊' },
    { key: 'notify_im', label: '企微钉钉飞书' },
  ]},
  { match: ['护士排班', '调班申请', '护士调班', '排班/调班', '值班通知'], caps: [
    { key: 'nurse_shift', label: '护士排班' },
    { key: 'notify_im', label: '企微钉钉飞书' },
  ]},
  { match: ['玩家FAQ', '玩家攻略', '客服工单', '活动规则', '游戏FAQ'], caps: [
    { key: 'game_support', label: '玩家FAQ' },
    { key: 'notify_im', label: '企微钉钉飞书' },
  ]},
  { match: ['请假', '年假', '调休'], caps: [{ key: 'approval_flow', label: '审批流' }, { key: 'chat_qa', label: '智能问答' }] },
  { match: ['报销', '费用报销'], caps: [{ key: 'approval_flow', label: '审批流' }, { key: 'kb_document', label: '知识库' }] },
  { match: ['用印', '盖章'], caps: [{ key: 'approval_flow', label: '审批流' }] },
  { match: ['待办', '已办'], caps: [{ key: 'approval_inbox', label: '待办中心' }, { key: 'approval_flow', label: '审批流' }] },
]

function capsForScenarioName(name: string): Array<{ key: string; label: string }> {
  const n = name.trim()
  for (const row of SCENARIO_CAPABILITY_MAP) {
    if (row.match.some((t) => n.includes(t) || t.includes(n))) return row.caps
  }
  return []
}

/** 行业向导：按所选场景解析能力；不再静默灌 BASELINE（避免假审批 Tab / codegen 乱页） */
export function buildPublishedModulesFromIndustry(opts: {
  industryKey: string
  industryLabel: string
  scenarioNames: string[]
}): PublishedModuleItem[] {
  const items: PublishedModuleItem[] = []
  const seen = new Set<string>()

  const push = (item: PublishedModuleItem) => {
    if (seen.has(item.key)) return
    seen.add(item.key)
    items.push(item)
  }

  const ind = INDUSTRIES_SHOWCASE.find((i) => i.key === opts.industryKey)
  push({
    key: opts.industryKey,
    label: opts.industryLabel,
    iconKey: ind?.iconKey ?? 'office',
    kind: 'industry',
    source: 'user',
  })

  for (const name of opts.scenarioNames) {
    push({
      key: `scene:${name}`,
      label: name,
      iconKey: 'workflow',
      kind: 'scenario',
      source: 'user',
    })
    for (const cap of capsForScenarioName(name)) {
      push({
        key: cap.key,
        label: cap.label,
        iconKey: iconForModuleKey(cap.key),
        kind: 'module',
        source: 'user',
      })
    }
  }

  // 无场景命中时，才补行业轻量推荐（仍不灌整套 BASELINE）
  const hasModule = items.some((m) => m.kind === 'module')
  if (!hasModule) {
    const extras = INDUSTRY_EXTRA[opts.industryKey] ?? INDUSTRY_EXTRA.office ?? []
    for (const pick of extras) {
      if (pick.type !== 'module') continue
      push({
        key: pick.key,
        label: pick.label,
        iconKey: iconForModuleKey(pick.key),
        kind: 'module',
        source: 'auto',
      })
    }
    for (const pick of BASELINE_PICKS) {
      if (pick.type !== 'module') continue
      push({
        key: pick.key,
        label: pick.label,
        iconKey: iconForModuleKey(pick.key),
        kind: 'module',
        source: 'auto',
      })
    }
  }

  return items
}

/** 模块组装视图：用户手动勾选的功能 */
export function buildPublishedModulesFromWidgets(
  widgets: { key: string; name: string; iconKey: string }[],
): PublishedModuleItem[] {
  return widgets.map((w) => ({
    key: w.key,
    label: w.name,
    iconKey: w.iconKey,
    kind: 'module' as const,
    source: 'user' as const,
  }))
}

/** 手机预览区最多展示的功能块（优先用户选择） */
export function pickPhonePreviewModules(modules: PublishedModuleItem[], limit = 4): PublishedModuleItem[] {
  const candidates = modules.filter(
    (m) => (m.kind === 'module' || m.kind === 'capability' || m.kind === 'scenario')
      && !PHONE_SKIP_KEYS.has(m.key),
  )
  const sorted = [...candidates].sort((a, b) => {
    const rank = (m: PublishedModuleItem) => {
      if (m.source === 'user') return 0
      if (m.source === 'suggest') return 1
      return 2
    }
    const dr = rank(a) - rank(b)
    if (dr !== 0) return dr
    if (a.kind === 'scenario' && b.kind !== 'scenario') return 1
    if (b.kind === 'scenario' && a.kind !== 'scenario') return -1
    return 0
  })
  return sorted.slice(0, limit)
}

const WIDGET_TINTS = [
  'var(--pri-soft)',
  '#fef3c7',
  '#ecfdf5',
  '#ede9fe',
  '#fce7f3',
]

export function widgetTint(index: number): string {
  return WIDGET_TINTS[index % WIDGET_TINTS.length]
}
