import { Link, Navigate, useParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichArticleBody from '../../components/b2b/enrichment/EnrichArticleBody'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { getCaseStudy, resolveCaseBlocks } from '../../data/siteCases'
import { caseIndustryTheme, enrichCardStyle } from '../../data/enrichVisualThemes'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'
import type { CSSProperties } from 'react'

export default function CaseDetailPage() {
  const { slug = '' } = useParams()
  const study = getCaseStudy(slug)

  usePageMeta(
    study
      ? { title: `${study.name} · 积木仓`, description: study.summary }
      : null,
  )

  if (!study) {
    return <Navigate to={ROUTES.cases} replace />
  }

  const theme = caseIndustryTheme(study.industry)
  const blocks = resolveCaseBlocks(study)

  return (
    <MarketingSiteShell skin="landed" pageTitle={study.name} pageEyebrow={study.tag ?? '客户案例'} pageLead={study.summary}>
      <article className="enrich-card enrich-detail-hero" style={enrichCardStyle(theme) as CSSProperties}>
        <EnrichCardVisual icon={theme.icon} label={study.industry} sublabel="完整案例" />
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
          <AgentButtonContent>打开一页纸摘要（PDF）</AgentButtonContent>
        </a>
        <Link to={ROUTES.cases} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent trailing={false}>返回案例列表</AgentButtonContent>
        </Link>
        <a href={ROUTES.contactDemo} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent>预约演示</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
