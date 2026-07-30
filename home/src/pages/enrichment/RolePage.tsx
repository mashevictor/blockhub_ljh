import { Link, Navigate, useParams } from 'react-router-dom'
import { useI18n, useT } from '@blockhub/i18n/react'
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
  const { locale } = useI18n()
  const { role = '' } = useParams()
  const raw = getRolePage(role)
  const page = raw ? localizeRolePage(t, raw, locale) : undefined

  usePageMeta(
    page ? { title: `${page.title} · BlockHub`, description: page.subtitle } : null,
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
          <h2 id="role-questions-title">{t('home.enrich.role.questions_title')}</h2>
          <p>{t('home.enrich.role.questions_lead')}</p>
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
          <h2 id="role-downloads-title">{t('home.enrich.role.downloads_title')}</h2>
          <p>{t('home.enrich.role.downloads_lead')}</p>
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
          <AgentButtonContent trailing={false}>{t('home.enrich.role.pricing')}</AgentButtonContent>
        </Link>
      </div>
    </MarketingSiteShell>
  )
}
