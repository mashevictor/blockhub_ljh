import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  CAPABILITIES_SHOWCASE,
  PLATFORMS_SHOWCASE,
} from '../data/showcase'
import { fetchCatalogSummary, type CatalogSummary } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { capabilityColor } from '../data/iconPalette'
import { PLATFORM_STATS } from '@shared/platformStats'
import {
  DynamicIcon,
  IconDevices,
  IconLayers,
  IconZap,
  CAPABILITY_ICONS,
} from './icons'

export default function PlatformShowcaseFooter() {
  const { theme } = useTheme()
  const [summary, setSummary] = useState<CatalogSummary | null>(null)

  useEffect(() => {
    fetchCatalogSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const sceneBars = useMemo(() => {
    const office = summary?.office_count ?? PLATFORM_STATS.officeScenarios
    const industry = summary?.industry_count ?? PLATFORM_STATS.industryScenarios
    const total = PLATFORM_STATS.scenarios
    return [
      { label: '通用办公', count: office, color: '#4338ca' },
      { label: '行业场景', count: industry, color: '#0891b2' },
    ].map((s) => ({ ...s, pct: (s.count / total) * 100 }))
  }, [summary])

  return (
    <section className="showcase-footer" aria-label="平台能力总览">
      <div className="showcase-footer-inner">
        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-violet"><IconZap size={20} /></span>
            <div>
              <h2>{PLATFORM_STATS.capabilities} 项能力 · {PLATFORM_STATS.agents} 个助手</h2>
              <p>从想法到可用，常用能力一站配齐</p>
            </div>
          </header>
          <ul className="showcase-cap-grid">
            {CAPABILITIES_SHOWCASE.map((c) => {
              const color = capabilityColor(c.id, theme) || c.color
              const Icon = CAPABILITY_ICONS[c.iconKey] ?? IconZap
              return (
                <li key={c.id} className="showcase-cap-card" style={{ '--cap-color': color } as CSSProperties}>
                  <span className="showcase-cap-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{c.name}</strong>
                    <span>{c.desc}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-sky"><IconLayers size={20} /></span>
            <div>
              <h2>{PLATFORM_STATS.scenarios} 业务场景</h2>
              <p>办公与行业场景，点选就能用</p>
            </div>
          </header>
          <ul className="showcase-scene-bars">
            {sceneBars.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <div className="showcase-scene-track">
                  <i style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
                <em>{s.count}</em>
              </li>
            ))}
          </ul>
          <p className="showcase-scene-foot">
            通用办公 <strong>{summary?.office_count ?? PLATFORM_STATS.officeScenarios}</strong> 项 ·
            办公 <strong>{summary?.office_groups ?? PLATFORM_STATS.officeGroups}</strong> 大分类 ·
            <strong>{summary?.industry_packs ?? PLATFORM_STATS.industryPacks}</strong> 个行业包
          </p>
        </article>

        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-cyan"><IconDevices size={20} /></span>
            <div>
              <h2>{PLATFORM_STATS.platforms} 端全覆盖</h2>
              <p>一次发布，网页和手机同步可用</p>
            </div>
          </header>
          <ul className="showcase-plat-grid">
            {PLATFORMS_SHOWCASE.map((p) => (
              <li key={p.id} className="showcase-plat-card">
                <span className="showcase-plat-icon">
                  <DynamicIcon name={p.iconKey} size={22} />
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.sub}</span>
                </div>
                <em>已支持</em>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
