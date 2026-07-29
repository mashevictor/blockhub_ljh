/** Office category labels for AgentInput / promptSuggest. */

import type { TranslateFn } from './industryLabels'

const OFFICE_KEYS = [
  { zh: '人事行政', key: 'hr' },
  { zh: '财务法务', key: 'finance' },
  { zh: '知识协同', key: 'kb' },
  { zh: '流程审批', key: 'approval' },
  { zh: '数据报表', key: 'report' },
  { zh: '消息通知', key: 'notify' },
  { zh: 'IT与资产', key: 'it' },
  { zh: '外部对接', key: 'external' },
] as const

export function officeCategoryLabel(t: TranslateFn, zhName: string): string {
  const hit = OFFICE_KEYS.find((o) => o.zh === zhName)
  if (!hit) return zhName
  return t(`home.agent.office.${hit.key}`)
}

export function officeCategories(t: TranslateFn): { key: string; label: string }[] {
  return OFFICE_KEYS.map((o) => ({ key: o.zh, label: t(`home.agent.office.${o.key}`) }))
}

export const PANEL_HINT_KEYS: Record<string, string> = {
  guide: 'home.agent.hint.guide',
  browse: 'home.agent.hint.browse',
  filtering: 'home.agent.hint.filtering',
  empty: 'home.agent.hint.empty',
  free: 'home.agent.hint.free',
  ime: 'home.agent.hint.ime',
}
