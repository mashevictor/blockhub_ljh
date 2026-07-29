import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import { fetchIndustrySites, type IndustrySiteSummary } from '../api/client'
import { INDUSTRIES_SHOWCASE } from '../data/showcase'
import { industryAssets, industryCardImage } from '../data/industryAssets'
import { usePageMeta } from '../hooks/usePageMeta'
import { ROUTES } from '../routes/paths'
import IndustrySiteShell from '../components/industry/IndustrySiteShell'
import { INDUSTRY_ICONS, IconSparkles } from '../components/icons'
import { AgentButtonContent } from '../components/AgentChevron'
import LazyCover from '../components/LazyCover'
import { industryAlt, industryDesc, industryName } from '../i18n/industryLabels'
import '../styles/b2b-landing.css'

const FALLBACK_SITES: IndustrySiteSummary[] = INDUSTRIES_SHOWCASE.map((ind) => ({
  key: ind.key,
  name: ind.name,
  icon: '📦',
  color: ind.color,
  tagline: ind.desc,
  scenes: ind.count,
  site_url: ROUTES.industryDetail(ind.key),
  assets: industryAssets(ind.key),
  theme: { primary: ind.color },
}))

export default function IndustrySitesIndexPage() {
  const t = useT()
  const [sites, setSites] = useState<IndustrySiteSummary[]>(FALLBACK_SITES)

  usePageMeta({
    title: t('home.industry.hub.meta_title'),
    description: t('home.industry.hub.meta_desc'),
    ogImage: industryAssets('office').og,
    ogUrl: typeof window !== 'undefined' ? `${window.location.origin}/industry` : undefined,
  })

  useEffect(() => {
    fetchIndustrySites()
      .then(setSites)
      .catch(() => setSites(FALLBACK_SITES))
  }, [])

  return (
    <IndustrySiteShell theme={{ primary: '#0d47a1' }}>
      <section
        className="industry-hub-hero-banner"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(13, 71, 161, 0.92) 0%, rgba(25, 118, 210, 0.78) 55%, rgba(0, 184, 148, 0.35) 100%), url(${industryAssets('office').hero})`,
        }}
      >
        <div className="industry-hub-hero-inner">
          <span className="b2b-eyebrow industry-hub-eyebrow-light">{t('home.industry.hub.eyebrow')}</span>
          <h1>{t('home.industry.hub.title')}</h1>
          <p>{t('home.industry.hub.lead')}</p>
          <Link to={ROUTES.home} className="btn-primary industry-hub-hero-cta">
            <AgentButtonContent>{t('home.industry.hub.cta_home')}</AgentButtonContent>
          </Link>
        </div>
      </section>

      <section className="b2b-section industry-hub-section">
        <div className="b2b-section-title">
          <span className="b2b-eyebrow">{t('home.industry.hub.section_eyebrow')}</span>
          <h2>
            <em>{t('home.industry.hub.section_title', { n: sites.length })}</em>
          </h2>
          <p>{t('home.industry.hub.section_desc')}</p>
        </div>

        <div className="industry-hub-grid">
          {sites.map((site) => {
            const Icon = INDUSTRY_ICONS[site.key] ?? IconSparkles
            const name = industryName(t, site.key, site.name)
            const tagline = industryDesc(t, site.key, site.tagline)
            return (
              <Link
                key={site.key}
                to={ROUTES.industryDetail(site.key)}
                className="industry-hub-card"
                style={{ '--card-accent': site.color } as CSSProperties}
              >
                <LazyCover
                  className="industry-hub-feature-img"
                  src={industryCardImage(site.key)}
                  alt={industryAlt(t, site.key, site.name)}
                >
                  <span className="industry-card-visual-title">{name}</span>
                  <span className="industry-hub-feature-icon" aria-hidden>
                    <Icon size={22} />
                  </span>
                  <span className="industry-hub-feature-shade" aria-hidden />
                </LazyCover>
                <div className="industry-hub-body">
                  <span className="industry-hub-badge">
                    {t('home.industry.card.badge', { n: site.scenes })}
                  </span>
                  <h2>{name}</h2>
                  <p>{tagline}</p>
                  <span className="industry-hub-cta">
                    <AgentButtonContent>{t('home.industry.card.enter')}</AgentButtonContent>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </IndustrySiteShell>
  )
}
