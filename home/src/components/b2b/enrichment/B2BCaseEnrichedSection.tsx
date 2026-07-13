import { Link } from 'react-router-dom'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { CASE_STUDIES, getFeaturedCase } from '../../../data/siteCases'
import { ROUTES } from '../../../routes/paths'

const FEATURED_CASE = getFeaturedCase()
const SHORT_CASES = CASE_STUDIES.filter((c) => c.slug !== FEATURED_CASE.slug).slice(0, 2)

export default function B2BCaseEnrichedSection() {
  return (
    <section id="case" className="b2b-section enrich-case-section" aria-labelledby="enrich-case-title">
      <div className="b2b-section-title">
        <span className="b2b-eyebrow enrich-eyebrow">
          <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
          对内转发材料
        </span>
        <h2 id="enrich-case-title">深度案例 · 可转发</h2>
        <p>制造深度案例 + 2 短案例 + 一页纸摘要下载</p>
      </div>
      <div className="enrich-case-featured">
        <article className="enrich-case-long">
          {FEATURED_CASE.tag ? <span className="enrich-case-tag">{FEATURED_CASE.tag}</span> : null}
          <h3>{FEATURED_CASE.name}</h3>
          <p className="enrich-case-summary">{FEATURED_CASE.summary}</p>
          <div className="enrich-case-metrics">
            {FEATURED_CASE.metrics.map((m) => (
              <div key={m.label} className="enrich-metric">
                <strong>{m.value}</strong>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
          <Link
            to={ROUTES.caseDetail(FEATURED_CASE.slug)}
            className="b2b-btn-primary agent-action-btn enrich-case-cta"
          >
            <AgentButtonContent>查看完整案例</AgentButtonContent>
          </Link>
        </article>
        <div className="enrich-case-short-grid">
          {SHORT_CASES.map((c) => (
            <article key={c.slug} className="b2b-case-item enrich-case-short">
              <div className="b2b-case-name">{c.industry}</div>
              <p>{c.summary}</p>
            </article>
          ))}
          <Link to={ROUTES.cases} className="enrich-case-all">
            <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
            查看全部案例
          </Link>
        </div>
      </div>
    </section>
  )
}
