/** Localize industry pack detail interiors (scenes / visual / enrich / site chrome). */

import type { IndustryPackDetail, IndustryPackEnrichment, IndustryPackScene } from '../api/client'
import type { IndustryVisualTheme } from '../data/industryVisualThemes'
import { industryDesc, industryName } from './industryLabels'
import { solutionLabel } from './contentLabels'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

const CJK_RE = /[\u4e00-\u9fff]/

function hasCjk(text: string | undefined | null): boolean {
  return Boolean(text && CJK_RE.test(text))
}

function tr(t: TranslateFn, key: string, fallback: string): string {
  const text = t(key)
  return text === key ? fallback : text
}

/** Prefer i18n key; if missing and fallback still CJK, try alternate non-CJK. */
function trPrefer(
  t: TranslateFn,
  key: string,
  fallback: string,
  alternate?: string,
): string {
  const text = t(key)
  if (text !== key) return text
  if (!hasCjk(fallback)) return fallback
  if (alternate && !hasCjk(alternate)) return alternate
  return fallback
}

function ui(t: TranslateFn, packKey: string, suffix: string, fallback: string, alternate?: string): string {
  return trPrefer(t, `industry.ui.${packKey}.${suffix}`, fallback, alternate)
}

function sceneField(
  t: TranslateFn,
  packKey: string,
  index1: number,
  field: 'name' | 'problem' | 'category',
  fallback: string,
): string {
  const idx = String(index1).padStart(3, '0')
  return tr(t, `scene.${packKey}.${idx}.${field}`, fallback)
}

function localizeSceneName(
  t: TranslateFn,
  packKey: string,
  index1: number,
  fallback: string,
): string {
  const fromScene = sceneField(t, packKey, index1, 'name', fallback)
  if (!hasCjk(fromScene)) return fromScene
  // content.solution.* is hand-translated EN; prefer over glossary leftovers in scene.gen
  const fromSolution = solutionLabel(t, packKey, index1 - 1, '')
  if (fromSolution && !hasCjk(fromSolution)) return fromSolution
  if (fallback && !hasCjk(fallback)) return fallback
  return fromSolution || fromScene
}

function localizeSceneProblem(
  t: TranslateFn,
  packKey: string,
  index1: number,
  name: string,
  fallback?: string,
): string | undefined {
  if (!fallback) return undefined
  const fromScene = sceneField(t, packKey, index1, 'problem', fallback)
  if (!hasCjk(fromScene)) return fromScene
  if (fallback && !hasCjk(fallback)) return fallback
  const fb = t('home.industry.detail.problem_fallback', { name })
  return fb === 'home.industry.detail.problem_fallback' ? name : fb
}

function localizeSceneCategory(
  t: TranslateFn,
  packKey: string,
  index1: number,
  fallback: string,
  packName: string,
): string {
  const fromScene = sceneField(t, packKey, index1, 'category', fallback)
  if (!hasCjk(fromScene)) return fromScene
  return industryName(t, packKey, packName)
}

export function industryTagline(t: TranslateFn, key: string, fallback?: string): string {
  const fromGen = tr(t, `industry.${key}.tagline`, '')
  if (fromGen) return fromGen
  return industryDesc(t, key, fallback)
}

export function localizeVisualTheme(t: TranslateFn, theme: IndustryVisualTheme): IndustryVisualTheme {
  const key = theme.key
  const pitch = ui(t, key, 'pitch', theme.heroPitch ?? '')
  const highlights = theme.highlights.map((h, i) => ui(t, key, `highlight.${i}`, h))
  const stats = theme.stats.map((s, i) => ({
    ...s,
    label: ui(t, key, `stat.${i}.label`, s.label),
  })) as IndustryVisualTheme['stats']
  return {
    ...theme,
    heroPitch: pitch || theme.heroPitch,
    highlights,
    stats,
  }
}

function localizeScene(
  t: TranslateFn,
  packKey: string,
  scene: IndustryPackScene,
  index1: number,
  packName: string,
): IndustryPackScene {
  const name = localizeSceneName(t, packKey, index1, scene.name)
  return {
    ...scene,
    name,
    problem: localizeSceneProblem(t, packKey, index1, name, scene.problem),
    category: localizeSceneCategory(t, packKey, index1, scene.category, packName),
  }
}

function localizeEnrichment(
  t: TranslateFn,
  packKey: string,
  enrichment: IndustryPackEnrichment | undefined,
  visual: IndustryVisualTheme,
  tagline: string,
): IndustryPackEnrichment | undefined {
  if (!enrichment) return undefined

  const overview = ui(
    t,
    packKey,
    'overview',
    enrichment.overview,
    tagline || visual.heroPitch || '',
  )

  const srcHighlights = enrichment.highlights?.length ? enrichment.highlights : visual.highlights
  const highlights = srcHighlights.map((h, i) =>
    ui(t, packKey, `eh.${i}`, h, visual.highlights[i] ?? ''),
  )

  const tips = (enrichment.scene_tips ?? []).map((tip, i) => ({
    name: ui(t, packKey, `tip.${i}.name`, tip.name),
    tip: ui(t, packKey, `tip.${i}.tip`, tip.tip),
  }))

  return {
    ...enrichment,
    overview,
    highlights,
    scene_tips: tips,
  }
}

/** Deep-localize pack detail for the current locale (works offline via scene.gen + industry.ui.gen). */
export function localizeIndustryPackDetail(
  t: TranslateFn,
  detail: IndustryPackDetail,
  visual: IndustryVisualTheme,
): IndustryPackDetail {
  const packKey = detail.pack.key
  const name = industryName(t, packKey, detail.pack.name)
  const tagline = industryTagline(t, packKey, detail.pack.tagline)
  const localizedVisual = localizeVisualTheme(t, visual)

  const scenes = detail.scenes.map((s, i) => localizeScene(t, packKey, s, i + 1, name))

  const grouped = new Map<string, IndustryPackScene[]>()
  for (const s of scenes) {
    const cat = s.category || name
    const list = grouped.get(cat)
    if (list) list.push(s)
    else grouped.set(cat, [s])
  }
  const groups =
    grouped.size > 0
      ? Array.from(grouped.entries()).map(([category, items]) => ({ category, items }))
      : detail.groups.map((g) => ({
          category: g.category,
          items: g.items.map((item) => {
            const idx = detail.scenes.findIndex((s) => s.id === item.id)
            return localizeScene(t, packKey, item, idx >= 0 ? idx + 1 : 1, name)
          }),
        }))

  const title = t('home.industry.detail.site_title', { name })
  const description = t('home.industry.detail.site_desc', { tagline, n: detail.total })
  const createLabel = t('home.industry.detail.create_label', { name })

  const enrichment = localizeEnrichment(t, packKey, detail.enrichment, localizedVisual, tagline)

  return {
    ...detail,
    pack: {
      ...detail.pack,
      name,
      tagline,
    },
    scenes,
    groups,
    site: {
      ...detail.site,
      title: title === 'home.industry.detail.site_title' ? `${name} · BlockHub` : title,
      description:
        description === 'home.industry.detail.site_desc'
          ? `${tagline}`
          : description,
      cta: {
        ...detail.site.cta,
        create_label:
          createLabel === 'home.industry.detail.create_label'
            ? name
            : createLabel,
      },
    },
    enrichment,
  }
}
