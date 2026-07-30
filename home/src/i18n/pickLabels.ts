/** Localize agent pick / prompt-module labels (industry · scenario · module · capability). */

import { capabilityName } from './capabilityLabels'
import { industryName } from './industryLabels'
import { officeCategoryLabel } from './agentLabels'
import { localizeCatalogScenarioName } from './catalogSceneLabels'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

function heroScenarioLabel(t: TranslateFn, key: string, _fallback: string): string {
  const direct = t(`hero.${key}.label`)
  if (direct !== `hero.${key}.label`) return direct
  // rolePresets use s38-case / chip-* ; hero SSOT is s38
  const base = key.match(/^(s\d+)/)?.[1]
  if (base) {
    const fromHero = t(`hero.${base}.label`)
    if (fromHero !== `hero.${base}.label`) return fromHero
  }
  return ''
}

/** Display label for a pick stored with Chinese SSOT `label`. */
export function localizePromptPickLabel(
  t: TranslateFn,
  type: string,
  key: string,
  fallback: string,
): string {
  if (!key && !fallback) return ''
  if (type === 'industry') return industryName(t, key, fallback)
  if (type === 'office') {
    const fromKey = t(`home.agent.office.${key}`)
    if (fromKey !== `home.agent.office.${key}`) return fromKey
    return officeCategoryLabel(t, fallback)
  }
  if (type === 'capability' || type === 'module' || type === 'supplement') {
    return capabilityName(t, key, fallback)
  }
  if (type === 'scenario') {
    const fromHero = heroScenarioLabel(t, key, fallback)
    if (fromHero) return fromHero
    return localizeCatalogScenarioName(t, { id: key, name: fallback })
  }
  return fallback || key
}

export function localizePromptListJoin(t: TranslateFn, items: string[]): string {
  const sep = t('home.prompt.logical.sep')
  const joiner = sep === 'home.prompt.logical.sep' ? '、' : sep
  return items.join(joiner)
}
