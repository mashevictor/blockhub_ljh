import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  CAPABILITIES_SHOWCASE,
  PLATFORMS_SHOWCASE,
} from '../data/showcase'
import { fetchCatalogSummary, type CatalogSummary } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import {
  showcaseCapDesc,
  showcaseCapName,
  showcasePlatName,
  showcasePlatSub,
} from '../i18n/contentLabels'
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
  const t = useT()
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
      { label: t('content.showcase.footer.bar_office'), count: office, color: '#4338ca' },
      { label: t('content.showcase.footer.bar_industry'), count: industry, color: '#0891b2' },
    ].map((s) => ({ ...s, pct: (s.count / total) * 100 }))
  }, [summary, t])

  return (
    <section className="showcase-footer" aria-label={t('content.showcase.footer.aria')}>
      <div className="showcase-footer-inner">
        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-violet"><IconZap size={20} /></span>
            <div>
              <h2>
                {t('content.showcase.footer.caps_title', {
                  caps: PLATFORM_STATS.capabilities,
                  agents: PLATFORM_STATS.agents,
                })}
              </h2>
              <p>{t('content.showcase.footer.caps_lead')}</p>
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
                    <strong>{showcaseCapName(t, c.id, c.name)}</strong>
                    <span>{showcaseCapDesc(t, c.id, c.desc)}</span>
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
              <h2>{t('content.showcase.footer.scenes_title', { n: PLATFORM_STATS.scenarios })}</h2>
              <p>{t('content.showcase.footer.scenes_lead')}</p>
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
            {t('content.showcase.footer.scene_foot', {
              office: summary?.office_count ?? PLATFORM_STATS.officeScenarios,
              groups: summary?.office_groups ?? PLATFORM_STATS.officeGroups,
              packs: summary?.industry_packs ?? PLATFORM_STATS.industryPacks,
            })}
          </p>
        </article>

        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-cyan"><IconDevices size={20} /></span>
            <div>
              <h2>{t('content.showcase.footer.plat_title', { n: PLATFORM_STATS.platforms })}</h2>
              <p>{t('content.showcase.footer.plat_lead')}</p>
            </div>
          </header>
          <ul className="showcase-plat-grid">
            {PLATFORMS_SHOWCASE.map((p) => (
              <li key={p.id} className="showcase-plat-card">
                <span className="showcase-plat-icon">
                  <DynamicIcon name={p.iconKey} size={22} />
                </span>
                <div>
                  <strong>{showcasePlatName(t, p.id, p.name)}</strong>
                  <span>{showcasePlatSub(t, p.id, p.sub)}</span>
                </div>
                <em>{t('content.showcase.plat.ready')}</em>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
