import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { IndustryHeroVariant } from '../../data/industryStylePacks'
import { ROUTES } from '../../routes/paths'

export interface HeroStat {
  value: string
  label: string
}

interface Props {
  variant: IndustryHeroVariant
  accent: string
  gradientTo?: string
  heroImage: string
  motif: string
  badge: string
  title: string
  tagline: string
  stats: HeroStat[]
  icon: ReactNode
  ctaPrimary: ReactNode
  ctaSecondary: ReactNode
}

export default function IndustryHeroSection({
  variant,
  accent,
  gradientTo: _gradientTo,
  heroImage,
  motif,
  badge,
  title,
  tagline,
  stats,
  icon,
  ctaPrimary,
  ctaSecondary,
}: Props) {
  const grad = `linear-gradient(105deg, rgba(8, 15, 30, 0.82) 0%, rgba(8, 15, 30, 0.68) 45%, color-mix(in srgb, ${accent} 35%, rgba(8, 15, 30, 0.55)) 100%)`
  const bgStyle = {
    backgroundImage: `${grad}, url(${heroImage})`,
  } as CSSProperties

  const statsRow = (
    <div className="industry-site-stats-row">
      {stats.map((s) => (
        <div key={s.label}>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )

  const actions = (
    <div className="industry-detail-actions">
      {ctaPrimary}
      {ctaSecondary}
    </div>
  )

  if (variant === 'split-left') {
    return (
      <section className="industry-site-hero-banner industry-hero--split-left" style={bgStyle}>
        <div className="industry-hero-split">
          <div className="industry-hero-split-text">
            <Link to={ROUTES.industryHub} className="industry-detail-back">← 全部行业方案</Link>
            <span className="industry-detail-badge">{badge}</span>
            <div className="industry-site-hero-row">
              <span className="industry-detail-icon" aria-hidden>{icon}</span>
              <div>
                <h1>{title}</h1>
                <p className="industry-detail-tagline">{tagline}</p>
              </div>
            </div>
            {statsRow}
            {actions}
          </div>
          <div className="industry-hero-split-visual" aria-hidden>
            <span className="industry-hero-motif">{motif}</span>
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'split-right') {
    return (
      <section className="industry-site-hero-banner industry-hero--split-right" style={bgStyle}>
        <div className="industry-hero-split industry-hero-split-reverse">
          <div className="industry-hero-split-visual" aria-hidden>
            <span className="industry-hero-motif">{motif}</span>
          </div>
          <div className="industry-hero-split-text">
            <Link to={ROUTES.industryHub} className="industry-detail-back">← 全部行业方案</Link>
            <span className="industry-detail-badge">{badge}</span>
            <h1>{title}</h1>
            <p className="industry-detail-tagline">{tagline}</p>
            {statsRow}
            {actions}
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'stacked-dark') {
    return (
      <section className="industry-site-hero-banner industry-hero--stacked-dark" style={bgStyle}>
        <div className="industry-site-hero-content">
          <Link to={ROUTES.industryHub} className="industry-detail-back">← 全部行业方案</Link>
          <span className="industry-hero-motif industry-hero-motif-bg" aria-hidden>{motif}</span>
          <span className="industry-detail-badge">{badge}</span>
          <h1>{title}</h1>
          <p className="industry-detail-tagline">{tagline}</p>
          <div className="industry-hero-stacked-stats">{statsRow}</div>
          {actions}
        </div>
      </section>
    )
  }

  if (variant === 'soft-card') {
    return (
      <section className="industry-site-hero-banner industry-hero--soft-card" style={bgStyle}>
        <div className="industry-site-hero-content">
          <Link to={ROUTES.industryHub} className="industry-detail-back">← 全部行业方案</Link>
          <div className="industry-hero-card">
            <div className="industry-site-hero-row">
              <span className="industry-detail-icon" aria-hidden>{icon}</span>
              <div>
                <span className="industry-detail-badge">{badge}</span>
                <h1>{title}</h1>
                <p className="industry-detail-tagline">{tagline}</p>
              </div>
            </div>
            {statsRow}
            {actions}
          </div>
          <span className="industry-hero-motif" aria-hidden>{motif}</span>
        </div>
      </section>
    )
  }

  if (variant === 'minimal-bar') {
    return (
      <section className="industry-site-hero-banner industry-hero--minimal-bar" style={bgStyle}>
        <div className="industry-site-hero-content">
          <Link to={ROUTES.industryHub} className="industry-detail-back">← 全部行业方案</Link>
          <div className="industry-hero-bar">
            <span className="industry-detail-icon" aria-hidden>{icon}</span>
            <div className="industry-hero-bar-text">
              <span className="industry-detail-badge">{badge}</span>
              <h1>{title}</h1>
            </div>
            <span className="industry-hero-motif industry-hero-motif-sm" aria-hidden>{motif}</span>
          </div>
          <p className="industry-detail-tagline industry-hero-bar-tagline">{tagline}</p>
          {statsRow}
          {actions}
        </div>
      </section>
    )
  }

  /* centered (default) */
  return (
    <section className="industry-site-hero-banner industry-hero--centered" style={bgStyle}>
      <div className="industry-site-hero-content">
        <Link to={ROUTES.industryHub} className="industry-detail-back">← 全部行业方案</Link>
        <div className="industry-site-hero-row">
          <span className="industry-detail-icon" aria-hidden>{icon}</span>
          <div>
            <span className="industry-detail-badge">{badge}</span>
            <h1>{title}</h1>
            <p className="industry-detail-tagline">{tagline}</p>
          </div>
          <span className="industry-hero-motif" aria-hidden>{motif}</span>
        </div>
        {statsRow}
        {actions}
      </div>
    </section>
  )
}
