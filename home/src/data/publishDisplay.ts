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
  if (m.type === 'module' || m.type === 'capability') {
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
    kind: m.type === 'module' ? 'module' : m.type,
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

/** 行业向导：场景 + 行业推荐模块 */
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
  }

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
