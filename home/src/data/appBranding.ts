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

/** 20 行业深度包 · 生成应用默认名称（可改） */
export const INDUSTRY_DEFAULT_APP_NAMES: Record<string, string> = {
  office: '办公协同助手',
  mfg: '产线智造工作台',
  sales: '销售获客工作台',
  med: '医疗协同助手',
  game: '玩家服务台',
  retail: '门店经营助手',
  edu: '教培办学助手',
  finance: '金融合规工作台',
  logistics: '仓储调度助手',
  realestate: '楼盘物业助手',
  hotel: '酒店餐饮助手',
  energy: '能源运维助手',
  gov: '政务办事助手',
  legal: '律所办案助手',
  hr: '人力人事助手',
  marketing: '营销获客助手',
  construction: '工程现场助手',
  agriculture: '农事产销助手',
  media: '内容传媒助手',
  auto: '车服售后助手',
}

export function defaultAppNameForIndustry(industryKey: string): string {
  const key = (industryKey || '').trim()
  return INDUSTRY_DEFAULT_APP_NAMES[key] || '行业智能应用'
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
    if (industry) return defaultAppNameForIndustry(industry.key) || `${industry.label}助手`
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
