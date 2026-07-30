import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { CASE_STUDIES, getFeaturedCase } from '../../../data/siteCases'
import { localizeCaseStudy } from '../../../i18n/contentLabels'
import { ROUTES } from '../../../routes/paths'

export default function B2BCaseEnrichedSection() {
  const t = useT()
  const featured = localizeCaseStudy(t, getFeaturedCase())
  const shortCases = CASE_STUDIES.filter((c) => c.slug !== featured.slug)
    .slice(0, 2)
    .map((c) => localizeCaseStudy(t, c))

  return (
    <section id="case" className="b2b-section enrich-case-section" aria-labelledby="enrich-case-title">
      <div className="b2b-section-title">
        <span className="b2b-eyebrow enrich-eyebrow">
          <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
          {t('home.landing.cases.eyebrow')}
        </span>
        <h2 id="enrich-case-title">{t('home.landing.cases.title')}</h2>
        <p>{t('home.landing.cases.lead')}</p>
      </div>
      <div className="enrich-case-featured">
        <article className="enrich-case-long">
          {featured.tag ? <span className="enrich-case-tag">{featured.tag}</span> : null}
          <h3>{featured.name}</h3>
          <p className="enrich-case-summary">{featured.summary}</p>
          <div className="enrich-case-metrics">
            {featured.metrics.map((m) => (
              <div key={m.label} className="enrich-metric">
                <strong>{m.value}</strong>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
          <Link
            to={ROUTES.caseDetail(featured.slug)}
            className="b2b-btn-primary agent-action-btn enrich-case-cta"
          >
            <AgentButtonContent>{t('home.landing.cases.cta')}</AgentButtonContent>
          </Link>
        </article>
        <div className="enrich-case-short-grid">
          {shortCases.map((c) => (
            <article key={c.slug} className="b2b-case-item enrich-case-short">
              <div className="b2b-case-name">{c.industry}</div>
              <p>{c.summary}</p>
            </article>
          ))}
          <Link to={ROUTES.cases} className="enrich-case-all">
            <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
            {t('home.landing.cases.all')}
          </Link>
        </div>
      </div>
    </section>
  )
}
