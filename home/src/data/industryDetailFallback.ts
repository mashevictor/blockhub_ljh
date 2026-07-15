import type { IndustryPackDetail, IndustryPackScene } from '../api/client'
import { SCENES } from './constants'
import { industryAssets } from './industryAssets'
import { buildClientStaticEnrichment } from './industryEnrichStatic'
import { INDUSTRIES_SHOWCASE } from './showcase'
import { ROUTES } from '../routes/paths'

function shiftColor(hex: string, factor: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = Math.min(255, Math.floor(parseInt(h.slice(0, 2), 16) * factor))
  const g = Math.min(255, Math.floor(parseInt(h.slice(2, 4), 16) * factor))
  const b = Math.min(255, Math.floor(parseInt(h.slice(4, 6), 16) * factor))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function buildScenes(key: string, packName: string, count: number): IndustryPackScene[] {
  const names = SCENES[key]
  if (names?.length) {
    return names.map((name, i) => ({
      id: `${key}-fb-${i}`,
      name,
      category: packName,
      problem: `${name} · 行业典型业务闭环`,
      pages: 'approval+form',
      standard: '✓',
      agent: 'approval',
      type: 'industry' as const,
    }))
  }
  return Array.from({ length: Math.min(count, 12) }, (_, i) => ({
    id: `${key}-fb-${i}`,
    name: `${packName}场景 ${i + 1}`,
    category: packName,
    problem: `${packName}典型业务场景`,
    pages: 'approval+form',
    standard: '✓',
    agent: 'approval',
    type: 'industry' as const,
  }))
}

/** 同步构建行业详情，进入独立站时零等待渲染（第一版生产文案同源） */
export function buildIndustryPackDetailFallback(key: string): IndustryPackDetail | null {
  const meta = INDUSTRIES_SHOWCASE.find((i) => i.key === key)
  if (!meta) return null

  const scenes = buildScenes(key, meta.name, meta.count)
  const groups = [{ category: meta.name, items: scenes }]
  const assets = industryAssets(key)
  const enrichment = buildClientStaticEnrichment(key)

  return {
    pack: {
      key,
      name: meta.name,
      icon: '📦',
      color: meta.color,
      tagline: meta.desc,
    },
    scenes,
    groups,
    total: meta.count,
    full_pack: Boolean(meta.fullPack),
    site: {
      slug: key,
      title: `${meta.name} · 行业深度包 | 积木仓 BlockHub`,
      description: `${meta.desc}。含 ${meta.count} 项业务场景，>> 选模块一键生成网页与 App 应用。`,
      assets,
      theme: {
        primary: meta.color,
        gradient_to: shiftColor(meta.color, 0.85),
      },
      stats: {
        scenes: meta.count,
        platforms: 5,
        delivery: 'Web · iOS · Android · Windows · macOS',
      },
      cta: {
        create_label: `用 ${meta.name} 深度包创建`,
        create_href: `/#contact-create?mode=industry&pack=${key}`,
      },
      site_url: ROUTES.industryDetail(key),
    },
    enrichment,
  }
}
