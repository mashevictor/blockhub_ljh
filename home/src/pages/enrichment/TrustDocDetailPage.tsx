import { Link, Navigate, useParams } from 'react-router-dom'
import { useT, useI18n } from '@blockhub/i18n/react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichArticleBody from '../../components/b2b/enrichment/EnrichArticleBody'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { sectionsToBlocks } from '../../data/enrichBlocks'
import { enrichCardStyle, trustDocTheme } from '../../data/enrichVisualThemes'
import { getTrustDocArticle } from '../../data/enrichmentContent'
import { TRUST_DOCS } from '../../data/siteTrust'
import { localizeTrustArticle, trustDocDescription } from '../../i18n/contentLabels'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'
import type { CSSProperties } from 'react'

export default function TrustDocDetailPage() {
  const t = useT()
  const { locale } = useI18n()
  const { docId = '' } = useParams()
  const meta = TRUST_DOCS.find((d) => d.id === docId)
  const raw = getTrustDocArticle(docId)
  const article = raw ? localizeTrustArticle(t, raw, locale) : undefined
  const desc = meta ? trustDocDescription(t, meta.id, meta.description) : ''

  usePageMeta(
    article
      ? { title: `${article.title} · BlockHub`, description: article.subtitle }
      : null,
  )

  if (!article || !meta) {
    return <Navigate to={ROUTES.trust} replace />
  }

  const theme = trustDocTheme(docId)
  const blocks = sectionsToBlocks(article.sections, {
    relatedLinks: article.relatedLinks,
    relatedTitle: t('home.enrich.case.related_title'),
  })

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={article.title}
      pageEyebrow={t('home.enrich.trust.eyebrow')}
      pageLead={article.subtitle}
    >
      <article className="enrich-card enrich-trust-doc-detail" style={enrichCardStyle(theme) as CSSProperties}>
        <EnrichCardVisual
          icon={theme.icon}
          label={article.title}
          sublabel={t('home.enrich.trust.doc_sublabel')}
        />
        <div className="enrich-card-body enrich-card-body--compact">
          <p>{desc}</p>
        </div>
      </article>

      <EnrichArticleBody blocks={blocks} />

      <div className="enrich-section-foot enrich-detail-actions">
        <a
          href={article.downloadPath}
          target="_blank"
          rel="noopener noreferrer"
          className="b2b-btn-primary agent-action-btn"
        >
          <AgentButtonContent>{t('home.enrich.trust.download_pdf')}</AgentButtonContent>
        </a>
        <Link to={ROUTES.trust} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent trailing={false}>{t('home.enrich.trust.back')}</AgentButtonContent>
        </Link>
        <a href={ROUTES.contactDemo} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent>{t('home.enrich.trust.book_demo')}</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
