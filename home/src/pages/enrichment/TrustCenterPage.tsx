import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import { TRUST_DOCS, TRUST_FAQ_SAMPLES } from '../../data/siteTrust'
import { enrichCardStyle, trustDocTheme } from '../../data/enrichVisualThemes'
import { ROLE_PAGES } from '../../data/siteRoles'
import { localizeRolePage, localizeTrustDocCard } from '../../i18n/contentLabels'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function TrustCenterPage() {
  const t = useT()
  const rolePages = ROLE_PAGES.map((r) => localizeRolePage(t, r))
  const docs = TRUST_DOCS.map((d) => localizeTrustDocCard(t, d))
  const faqs = TRUST_FAQ_SAMPLES.map((q, i) => {
    const key = `home.enrich.trust.faq.${i}`
    const text = t(key)
    return text === key ? q : text
  })

  usePageMeta({
    title: `${t('home.enrich.trust.eyebrow')} · BlockHub`,
    description: t('home.landing.trust.lead'),
  })

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={t('home.landing.trust.title')}
      pageEyebrow={t('home.enrich.trust.eyebrow')}
      pageLead={t('home.landing.trust.lead')}
    >
      <section className="enrich-panel enrich-trust-docs" aria-labelledby="trust-docs-title">
        <div className="enrich-panel-head">
          <h2 id="trust-docs-title">{t('home.enrich.trust.docs_title')}</h2>
          <p>{t('home.enrich.trust.docs_lead')}</p>
        </div>
        <div className="enrich-panel-body">
          <div className="enrich-trust-doc-grid">
            {docs.map((doc) => {
              const theme = trustDocTheme(doc.id)
              return (
                <article
                  key={doc.id}
                  className="enrich-card enrich-trust-doc-card"
                  style={enrichCardStyle(theme) as CSSProperties}
                >
                  <EnrichCardVisual icon={theme.icon} label={doc.title} />
                  <div className="enrich-card-body enrich-card-body--compact">
                    <p>{doc.description}</p>
                    <Link to={ROUTES.trustDoc(doc.id)} className="enrich-link-btn agent-action-btn">
                      <AgentButtonContent>{t('home.enrich.trust.read_online')}</AgentButtonContent>
                    </Link>
                    <a
                      href={doc.downloadPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="enrich-dl-btn enrich-dl-btn--secondary"
                    >
                      <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                      {t('home.enrich.trust.download_pdf')}
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="enrich-panel enrich-trust-faq" aria-labelledby="trust-faq-title">
        <div className="enrich-panel-head">
          <h2 id="trust-faq-title">{t('home.enrich.trust.faq_title')}</h2>
          <p>{t('home.enrich.trust.faq_lead')}</p>
        </div>
        <div className="enrich-panel-body">
          <ul className="enrich-faq-list enrich-faq-list--cards">
            {faqs.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="enrich-panel enrich-role-links" aria-labelledby="trust-roles-title">
        <div className="enrich-panel-head">
          <h2 id="trust-roles-title">{t('home.enrich.trust.roles_title')}</h2>
          <p>{t('home.enrich.trust.roles_lead')}</p>
        </div>
        <div className="enrich-panel-body">
          <div className="enrich-role-chip-grid">
            {rolePages.map((role) => (
              <Link key={role.key} to={ROUTES.rolePage(role.key)} className="enrich-role-chip">
                <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                {role.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="enrich-section-foot">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>{t('home.enrich.trust.cta_demo')}</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
