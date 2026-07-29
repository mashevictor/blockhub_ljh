/** Industry pack display labels — keys in home.json (`home.industry.{key}.*`). */

import type { IndustryItem } from '../data/showcase'
import { INDUSTRIES_SHOWCASE } from '../data/showcase'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

const FALLBACK_NAME = Object.fromEntries(INDUSTRIES_SHOWCASE.map((i) => [i.key, i.name])) as Record<
  string,
  string
>
const FALLBACK_DESC = Object.fromEntries(INDUSTRIES_SHOWCASE.map((i) => [i.key, i.desc])) as Record<
  string,
  string
>

/** Resolved pack name for UI cards; falls back to SSOT Chinese if key missing. */
export function industryName(t: TranslateFn, key: string, fallback?: string): string {
  const fb = fallback ?? FALLBACK_NAME[key] ?? key
  const text = t(`home.industry.${key}.name`)
  return text === `home.industry.${key}.name` ? fb : text
}

/** Short tagline / desc under the card title. */
export function industryDesc(t: TranslateFn, key: string, fallback?: string): string {
  const fb = fallback ?? FALLBACK_DESC[key] ?? ''
  const text = t(`home.industry.${key}.desc`)
  return text === `home.industry.${key}.desc` ? fb : text
}

export function industryAlt(t: TranslateFn, key: string, fallbackName?: string): string {
  return t('home.industry.card.alt', { name: industryName(t, key, fallbackName) })
}

export function localizeIndustryItem<T extends Pick<IndustryItem, 'key' | 'name' | 'desc'>>(
  t: TranslateFn,
  item: T,
): T {
  return {
    ...item,
    name: industryName(t, item.key, item.name),
    desc: industryDesc(t, item.key, item.desc),
  }
}
