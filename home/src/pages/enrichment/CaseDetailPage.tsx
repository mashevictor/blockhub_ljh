import { Link, Navigate, useParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { AgentButtonContent } from '../../components/AgentChevron'
import { getCaseStudy } from '../../data/siteCases'
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

  return (
    <MarketingSiteShell pageTitle={study.name} pageEyebrow={study.tag ?? '客户案例'} pageLead={study.summary}>
      <div className="enrich-case-metrics enrich-case-metrics--detail">
        {study.metrics.map((m) => (
          <div key={m.label} className="enrich-metric">
            <strong>{m.value}</strong>
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      <section className="enrich-case-story">
        {study.story.map((para, i) => (
          <RichParagraph key={i} text={para} />
        ))}
      </section>

      <aside className="enrich-case-note">
        <strong>试点说明</strong>
        <p>{study.pilotNote}</p>
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
