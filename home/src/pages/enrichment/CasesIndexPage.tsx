import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { CASE_STUDIES } from '../../data/siteCases'
import { caseIndustryTheme, enrichCardStyle } from '../../data/enrichVisualThemes'
import { localizeCaseStudy } from '../../i18n/contentLabels'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function CasesIndexPage() {
  const t = useT()
  usePageMeta({
    title: `${t('home.enrich.cases.title')} · BlockHub`,
    description: t('home.enrich.cases.lead'),
  })

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={t('home.enrich.cases.title')}
      pageEyebrow={t('home.enrich.cases.eyebrow')}
      pageLead={t('home.enrich.cases.lead')}
    >
      <div className="enrich-cases-list">
        {CASE_STUDIES.map((raw) => {
          const c = localizeCaseStudy(t, raw)
          const theme = caseIndustryTheme(c.industry)
          return (
            <article
              key={c.slug}
              className="enrich-card enrich-case-list-card"
              style={enrichCardStyle(theme) as CSSProperties}
            >
              <EnrichCardVisual
                icon={theme.icon}
                label={c.industry}
                sublabel={t('content.case.list.sublabel')}
              />
              <div className="enrich-card-body">
                {c.tag ? <span className="enrich-case-tag">{c.tag}</span> : null}
                <h2>
                  <Link to={ROUTES.caseDetail(c.slug)}>{c.name}</Link>
                </h2>
                <p>{c.summary}</p>
                <div className="enrich-case-metrics">
                  {c.metrics.map((m) => (
                    <div key={m.label} className="enrich-metric">
                      <strong>{m.value}</strong>
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>
                <Link to={ROUTES.caseDetail(c.slug)} className="enrich-link-btn agent-action-btn">
                  <AgentButtonContent>{t('content.case.list.read')}</AgentButtonContent>
                </Link>
              </div>
            </article>
          )
        })}
      </div>
      <div className="enrich-section-foot">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>{t('content.case.list.cta')}</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
