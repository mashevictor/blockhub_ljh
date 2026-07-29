import { Link, Navigate, useParams } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import { enrichCardStyle } from '../../data/enrichVisualThemes'
import { getRolePage } from '../../data/siteRoles'
import { localizeRolePage } from '../../i18n/contentLabels'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

const ROLE_THEMES: Record<string, { color: string; from: string; to: string; icon: string }> = {
  'sales-ops': { color: '#0d47a1', from: '#eff6ff', to: '#dbeafe', icon: '📈' },
  it: { color: '#0891b2', from: '#ecfeff', to: '#cffafe', icon: '🛡' },
  finance: { color: '#059669', from: '#ecfdf5', to: '#d1fae5', icon: '💰' },
  procurement: { color: '#7c3aed', from: '#f5f3ff', to: '#ede9fe', icon: '📋' },
}

export default function RolePage() {
  const t = useT()
  const { role = '' } = useParams()
  const raw = getRolePage(role)
  const page = raw ? localizeRolePage(t, raw) : undefined

  usePageMeta(
    page ? { title: `${page.title} · 积木仓`, description: page.subtitle } : null,
  )

  if (!page) {
    return <Navigate to={ROUTES.home} replace />
  }

  const theme = ROLE_THEMES[page.key] ?? ROLE_THEMES['sales-ops']

  return (
    <MarketingSiteShell
      pageTitle={page.title}
      pageEyebrow={t('home.enrich.role.eyebrow')}
      pageLead={page.subtitle}
    >
      <article className="enrich-card enrich-role-hero" style={enrichCardStyle(theme) as CSSProperties}>
        <EnrichCardVisual icon={theme.icon} label={page.title} sublabel={t('home.enrich.role.eyebrow')} />
      </article>

      <section className="enrich-panel enrich-role-questions" aria-labelledby="role-questions-title">
        <div className="enrich-panel-head">
          <h2 id="role-questions-title">您可能关心的问题</h2>
          <p>可向全站智能体助手提问，以下为高频问题</p>
        </div>
        <div className="enrich-panel-body">
          <ul className="enrich-faq-list enrich-faq-list--cards">
            {page.topQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="enrich-panel enrich-role-downloads" aria-labelledby="role-downloads-title">
        <div className="enrich-panel-head">
          <h2 id="role-downloads-title">推荐资料</h2>
          <p>与子站列表页同套卡片与链接样式</p>
        </div>
        <div className="enrich-panel-body">
          <div className="enrich-trust-dl enrich-trust-dl--role">
            {page.downloads.map((dl) => {
              const isPrint = dl.path.startsWith('/downloads/')
              if (isPrint) {
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
        </div>
      </section>

      <div className="enrich-section-foot enrich-detail-actions">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>{page.cta}</AgentButtonContent>
        </a>
        <Link to={ROUTES.pricing} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent trailing={false}>定价说明</AgentButtonContent>
        </Link>
      </div>
    </MarketingSiteShell>
  )
}
