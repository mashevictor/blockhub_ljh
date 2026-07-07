import type { PromptModule } from '../components/agentInputLogic'
import type { SuggestItem } from './promptSuggest'

export interface AppBrandingInput {
  appName: string
  iconUrl: string
  primaryColor: string
}

export const DEFAULT_PRIMARY_COLOR = '#4338ca'

export function emptyBranding(appName = ''): AppBrandingInput {
  return { appName, iconUrl: '', primaryColor: DEFAULT_PRIMARY_COLOR }
}

export function resolveAppName(custom: string, fallback: string): string {
  const trimmed = custom.trim()
  return trimmed || fallback
}

function cleanIntentTitle(text: string, max = 14): string {
  const t = text
    .trim()
    .replace(/^>>\s*$/, '')
    .replace(/[，。！？、,.!?；;：:\s]+/g, '')
    .replace(/^(搞一个|做一个|帮我做|想要|需要|请)/, '')
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/** 根据描述、已选模块与智能推荐结果生成默认应用名 */
export function deriveDefaultAppName(opts: {
  modules: PromptModule[]
  suggestions?: SuggestItem[]
  intentText?: string
  usedAi?: boolean
  fallback?: string
}): string {
  const { modules, suggestions = [], intentText = '', usedAi = false, fallback = '我的应用' } = opts
  const intentName = cleanIntentTitle(intentText)

  const fromModules = (list: PromptModule[]) => {
    const scenarios = list.filter((m) => m.type === 'scenario')
    const funcs = list.filter((m) => m.type === 'module' || m.type === 'capability')
    const industry = list.find((m) => m.type === 'industry')

    if (scenarios.length === 1) return scenarios[0].label
    if (scenarios.length > 1) return `${scenarios[0].label}·${scenarios[1].label}`
    if (funcs.length >= 2) return `${funcs[0].label}${funcs[1].label}`
    if (funcs.length === 1 && industry) return `${industry.label}·${funcs[0].label}`
    if (funcs.length === 1) return funcs[0].label
    if (industry) return `${industry.label}助手`
    return ''
  }

  if (usedAi && intentName.length >= 2) return intentName

  const userName = fromModules(modules.filter((m) => m.source !== 'auto'))
  if (userName) return userName

  if (intentName.length >= 2) return intentName

  const suggestPicks = suggestions.map((s) => ({
    id: `${s.pick.type}:${s.pick.key}`,
    type: s.pick.type,
    key: s.pick.key,
    label: s.pick.label,
  })) as PromptModule[]
  const suggestName = fromModules(suggestPicks)
  if (suggestName) return suggestName

  return fallback
}
