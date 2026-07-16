import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { CASE_STUDIES } from '../../data/siteCases'
import { caseIndustryTheme, enrichCardStyle } from '../../data/enrichVisualThemes'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function CasesIndexPage() {
  usePageMeta({
    title: '客户案例 · 积木仓',
    description: '制造、零售、物流等行业真实试点案例，含调整过程与可转发材料',
  })

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle="客户案例"
      pageEyebrow="落地案例"
      pageLead="深度案例 · 短案例速览 · 可下载一页纸摘要"
    >
      <div className="enrich-cases-list">
        {CASE_STUDIES.map((c) => {
          const theme = caseIndustryTheme(c.industry)
          return (
            <article
              key={c.slug}
              className="enrich-card enrich-case-list-card"
              style={enrichCardStyle(theme) as CSSProperties}
            >
              <EnrichCardVisual icon={theme.icon} label={c.industry} sublabel="客户案例" />
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
                  <AgentButtonContent>查看完整案例</AgentButtonContent>
                </Link>
              </div>
            </article>
          )
        })}
      </div>
      <div className="enrich-section-foot">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>预约演示 · 获取同行业材料包</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
