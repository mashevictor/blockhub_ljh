/**
 * 独立站视觉模板预览缓存策略（office / mfg 等共用）
 * - 每行业预载 3 套：默认模板优先，再按目录顺序补齐
 * - 其余模板不预载，UI 需展示「未缓存」提示
 */

import {
  INDUSTRY_MICROSITE_TEMPLATES,
  defaultMicrositeIdForPack,
  getMicrositeTemplate,
} from './industryMicrositeTemplates'

export const MICROSITE_PREVIEW_CACHE_LIMIT = 3

/** 某行业站应预载的模板 id（默认优先 + 目录补齐） */
export function getCachedMicrositeIds(
  packKey: string,
  limit = MICROSITE_PREVIEW_CACHE_LIMIT,
): string[] {
  const ids: string[] = []
  const preferred = defaultMicrositeIdForPack(packKey)
  if (preferred && getMicrositeTemplate(preferred)) ids.push(preferred)
  for (const t of INDUSTRY_MICROSITE_TEMPLATES) {
    if (ids.length >= limit) break
    if (!ids.includes(t.id)) ids.push(t.id)
  }
  return ids.slice(0, limit)
}

export function isMicrositeCached(packKey: string, templateId: string): boolean {
  return getCachedMicrositeIds(packKey).includes(templateId)
}

export function micrositeCacheHint(cached: boolean): string {
  return cached
    ? '已预载 · 点击即切'
    : '未预载 · 点选后即时生成'
}
