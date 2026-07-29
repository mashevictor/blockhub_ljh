import { Link, Navigate, useParams } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichArticleBody from '../../components/b2b/enrichment/EnrichArticleBody'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { getCaseStudy, resolveCaseBlocks } from '../../data/siteCases'
import { caseIndustryTheme, enrichCardStyle } from '../../data/enrichVisualThemes'
import { localizeCaseStudy } from '../../i18n/contentLabels'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'
import type { CSSProperties } from 'react'

export default function CaseDetailPage() {
  const t = useT()
  const { slug = '' } = useParams()
  const raw = getCaseStudy(slug)
  const study = raw ? localizeCaseStudy(t, raw) : undefined

  usePageMeta(
    study
      ? { title: `${study.name} · BlockHub`, description: study.summary }
      : null,
  )

  if (!study) {
    return <Navigate to={ROUTES.cases} replace />
  }

  const theme = caseIndustryTheme(study.industry)
  const blocks = resolveCaseBlocks(study)

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={study.name}
      pageEyebrow={study.tag ?? t('content.enrich.case_customer')}
      pageLead={study.summary}
    >
      <article className="enrich-card enrich-detail-hero" style={enrichCardStyle(theme) as CSSProperties}>
        <EnrichCardVisual icon={theme.icon} label={study.industry} sublabel={t('home.enrich.case.full_sublabel')} />
        <div className="enrich-case-metrics enrich-case-metrics--detail enrich-card-body enrich-card-body--inline">
          {study.metrics.map((m) => (
            <div key={m.label} className="enrich-metric">
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </article>

      <EnrichArticleBody blocks={blocks} />

      <div className="enrich-section-foot enrich-detail-actions">
        <a
          href={study.onePagerPath}
          target="_blank"
          rel="noopener noreferrer"
          className="b2b-btn-primary agent-action-btn"
        >
          <AgentButtonContent>{t('home.enrich.case.open_pdf')}</AgentButtonContent>
        </a>
        <Link to={ROUTES.cases} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent trailing={false}>{t('home.enrich.case.back')}</AgentButtonContent>
        </Link>
        <a href={ROUTES.contactDemo} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent>{t('home.enrich.case.book_demo')}</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
