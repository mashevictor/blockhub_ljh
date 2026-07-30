/** Catalog office / industry scenario display names — scene.gen + content.solution.*. */

import contentZh from '@shared/i18n/messages/zh-CN/content.json'
import { solutionLabel } from './contentLabels'
import { officeCategoryLabel } from './agentLabels'
import { SCENES } from '../data/constants'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

function tr(t: TranslateFn, key: string, fallback: string): string {
  const text = t(key)
  return text === key ? fallback : text
}

function pad3(n: number): string {
  return String(n).padStart(3, '0')
}

/** Parse office-001 / med-01 / mfg-2 → pack + 1-based index. */
export function parseCatalogSceneId(id: string): { pack: string; index1: number } | null {
  if (!id) return null
  const office = id.match(/^office-(\d+)$/i)
  if (office) return { pack: 'office', index1: Number(office[1]) }
  const packIdx = id.match(/^([a-z][a-z0-9_]*)-(\d+)$/i)
  if (packIdx && packIdx[1].toLowerCase() !== 'industry') {
    return { pack: packIdx[1].toLowerCase(), index1: Number(packIdx[2]) }
  }
  return null
}

function solutionIndexByZhName(packKey: string, zhName: string): number {
  if (!packKey || !zhName) return -1
  const fromScenes = SCENES[packKey]
  if (fromScenes) {
    const hit = fromScenes.indexOf(zhName)
    if (hit >= 0) return hit
  }
  const prefix = `solution.${packKey}.`
  for (const [k, v] of Object.entries(contentZh as Record<string, string>)) {
    if (k.startsWith(prefix) && v === zhName) {
      const n = Number(k.slice(prefix.length))
      if (Number.isFinite(n)) return n
    }
  }
  return -1
}

function sceneNameFromIndex(t: TranslateFn, pack: string, index1: number, fallback: string): string {
  const fromScene = tr(t, `scene.${pack}.${pad3(index1)}.name`, '')
  if (fromScene) return fromScene
  return solutionLabel(t, pack, index1 - 1, fallback)
}

function sceneCategoryFromIndex(t: TranslateFn, pack: string, index1: number, fallback: string): string {
  const fromScene = tr(t, `scene.${pack}.${pad3(index1)}.category`, '')
  if (fromScene) return fromScene
  if (pack === 'office') return officeCategoryLabel(t, fallback)
  return fallback
}

/** Localize a catalog scenario row (API SSOT name stays Chinese). */
export function localizeCatalogScenarioName(
  t: TranslateFn,
  s: { id: string; name: string; pack_key?: string },
): string {
  const parsed = parseCatalogSceneId(s.id)
  if (parsed) return sceneNameFromIndex(t, parsed.pack, parsed.index1, s.name)

  const pack = s.pack_key
  if (pack) {
    const idx0 = solutionIndexByZhName(pack, s.name)
    if (idx0 >= 0) return sceneNameFromIndex(t, pack, idx0 + 1, s.name)
  }

  const packs = new Set<string>([...(Object.keys(SCENES)), 'office'])
  if (pack) packs.add(pack)
  for (const p of packs) {
    const idx0 = solutionIndexByZhName(p, s.name)
    if (idx0 >= 0) return sceneNameFromIndex(t, p, idx0 + 1, s.name)
  }

  // Last resort: any content.solution.{pack}.{i} matching zh name
  for (const [k, v] of Object.entries(contentZh as Record<string, string>)) {
    if (!k.startsWith('solution.') || v !== s.name) continue
    const parts = k.split('.')
    if (parts.length !== 3) continue
    const [, p, idx] = parts
    const n = Number(idx)
    if (!p || !Number.isFinite(n)) continue
    return sceneNameFromIndex(t, p, n + 1, s.name)
  }

  return s.name
}

export function localizeCatalogScenarioCategory(
  t: TranslateFn,
  s: { id: string; name: string; category: string; pack_key?: string },
): string {
  const parsed = parseCatalogSceneId(s.id)
  if (parsed) return sceneCategoryFromIndex(t, parsed.pack, parsed.index1, s.category)

  const pack = s.pack_key
  if (pack) {
    const idx0 = solutionIndexByZhName(pack, s.name)
    if (idx0 >= 0) return sceneCategoryFromIndex(t, pack, idx0 + 1, s.category)
  }

  if (!s.pack_key || s.pack_key === 'office') {
    return officeCategoryLabel(t, s.category)
  }
  return s.category
}
