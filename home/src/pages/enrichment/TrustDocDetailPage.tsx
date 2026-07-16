import { Link, Navigate, useParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichArticleBody from '../../components/b2b/enrichment/EnrichArticleBody'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { enrichCardStyle, trustDocTheme } from '../../data/enrichVisualThemes'
import { getTrustDocArticle, resolveTrustDocBlocks } from '../../data/enrichmentContent'
import { TRUST_DOCS } from '../../data/siteTrust'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'
import type { CSSProperties } from 'react'

export default function TrustDocDetailPage() {
  const { docId = '' } = useParams()
  const meta = TRUST_DOCS.find((d) => d.id === docId)
  const article = getTrustDocArticle(docId)

  usePageMeta(
    article
      ? { title: `${article.title} · 积木仓`, description: article.subtitle }
      : null,
  )

  if (!article || !meta) {
    return <Navigate to={ROUTES.trust} replace />
  }

  const theme = trustDocTheme(docId)
  const blocks = resolveTrustDocBlocks(docId)

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={article.title}
      pageEyebrow="信任与合规"
      pageLead={article.subtitle}
    >
      <article className="enrich-card enrich-trust-doc-detail" style={enrichCardStyle(theme) as CSSProperties}>
        <EnrichCardVisual icon={theme.icon} label={article.title} sublabel="合规资料" />
        <div className="enrich-card-body enrich-card-body--compact">
          <p>{meta.description}</p>
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
          <AgentButtonContent>打开可打印版（PDF）</AgentButtonContent>
        </a>
        <Link to={ROUTES.trust} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent trailing={false}>返回信任中心</AgentButtonContent>
        </Link>
        <a href={ROUTES.contactDemo} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent>预约演示</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
