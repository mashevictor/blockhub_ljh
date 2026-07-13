import { Link, Navigate, useParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { getCaseStudy } from '../../data/siteCases'
import { caseIndustryTheme, enrichCardStyle } from '../../data/enrichVisualThemes'
import { RichParagraph } from '../../lib/enrichRichText'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

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

  return (
    <MarketingSiteShell pageTitle={study.name} pageEyebrow={study.tag ?? '客户案例'} pageLead={study.summary}>
      <div className="enrich-detail-hero enrich-card" style={enrichCardStyle(theme)}>
        <EnrichCardVisual icon={theme.icon} label={study.industry} sublabel="完整案例" />
        <div className="enrich-case-metrics enrich-case-metrics--detail enrich-card-body enrich-card-body--inline">
          {study.metrics.map((m) => (
            <div key={m.label} className="enrich-metric">
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="enrich-panel enrich-case-story">
        <div className="enrich-panel-head">
          <h2>案例故事</h2>
          <p>试点背景 · 方案调整 · 验收结果</p>
        </div>
        <div className="enrich-panel-body enrich-case-story-body">
          {study.story.map((para, i) => (
            <RichParagraph key={i} text={para} />
          ))}
        </div>
      </section>

      <aside className="enrich-case-note enrich-panel enrich-case-note-panel">
        <div className="enrich-panel-head enrich-panel-head--warm">
          <h2>试点说明</h2>
        </div>
        <div className="enrich-panel-body">
          <p>{study.pilotNote}</p>
        </div>
      </aside>

      <div className="enrich-section-foot enrich-case-actions">
        <a
          href={study.onePagerPath}
          target="_blank"
          rel="noopener noreferrer"
          className="b2b-btn-primary agent-action-btn"
        >
          <AgentButtonContent>下载一页纸方案摘要</AgentButtonContent>
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
