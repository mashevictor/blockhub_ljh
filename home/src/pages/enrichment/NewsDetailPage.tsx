import { Link, Navigate, useParams } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import NewsArticleBody from '../../components/b2b/enrichment/NewsArticleBody'
import { AgentButtonContent } from '../../components/AgentChevron'
import { getNewsArticle } from '../../data/siteNews'
import { localizeNewsArticle, newsCategoryLabel } from '../../i18n/contentLabels'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function NewsDetailPage() {
  const t = useT()
  const { slug = '' } = useParams()
  const raw = getNewsArticle(slug)
  const article = raw ? localizeNewsArticle(t, raw) : undefined

  usePageMeta(
    article
      ? { title: `${article.title} · BlockHub`, description: article.summary, ogImage: article.coverImage }
      : null,
  )

  if (!article) {
    return <Navigate to={ROUTES.news} replace />
  }

  const catLabel = newsCategoryLabel(t, article.category)

  return (
    <MarketingSiteShell pageTitle={article.title} pageEyebrow={catLabel} pageLead={article.summary}>
      <div className="enrich-news-meta">
        <span className="enrich-news-date">{article.date}</span>
        <span className="enrich-news-cat">{catLabel}</span>
      </div>
      <NewsArticleBody article={article} />
      <div className="enrich-section-foot enrich-detail-actions">
        <Link to={ROUTES.news} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent trailing={false}>{t('home.enrich.news.back')}</AgentButtonContent>
        </Link>
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>{t('home.enrich.news.book_demo')}</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
