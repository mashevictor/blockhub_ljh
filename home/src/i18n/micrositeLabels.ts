/** Microsite template display labels — keys in home.json (`home.industry.ms.tpl.*`). */

import type { IndustryMicrositeTemplate } from '../data/industryMicrositeTemplates'
import type { TranslateFn } from './industryLabels'

function tr(t: TranslateFn, key: string, fallback: string): string {
  const text = t(key)
  return text === key ? fallback : text
}

/** Style chip title: "Helios · Full-screen open" */
export function micrositeStyleLabel(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.style`, tpl.styleLabel)
}

export function micrositeName(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.name`, tpl.name)
}

export function micrositeCategory(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.category`, tpl.category)
}

export function micrositeBrand(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.brand`, tpl.brand)
}
