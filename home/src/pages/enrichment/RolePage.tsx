import { Link, Navigate, useParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import { getRolePage } from '../../data/siteRoles'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function RolePage() {
  const { role = '' } = useParams()
  const page = getRolePage(role)

  usePageMeta(
    page ? { title: `${page.title} · 积木仓`, description: page.subtitle } : null,
  )

  if (!page) {
    return <Navigate to={ROUTES.home} replace />
  }

  return (
    <MarketingSiteShell pageTitle={page.title} pageEyebrow="角色视角" pageLead={page.subtitle}>
      <section aria-labelledby="role-questions-title">
        <h2 id="role-questions-title">您可能关心的问题</h2>
        <ul className="enrich-faq-list">
          {page.topQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="role-downloads-title">
        <h2 id="role-downloads-title">推荐资料</h2>
        <div className="enrich-trust-dl enrich-trust-dl--role">
          {page.downloads.map((dl) => {
            const isExternal = dl.path.startsWith('/downloads/')
            if (isExternal) {
              return (
                <a
                  key={dl.title}
                  href={dl.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="enrich-dl-btn"
                >
                  <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                  {dl.title}
                </a>
              )
            }
            return (
              <Link key={dl.title} to={dl.path} className="enrich-dl-btn">
                <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                {dl.title}
              </Link>
            )
          })}
        </div>
      </section>

      <div className="enrich-section-foot">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>{page.cta}</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
