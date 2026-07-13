import { Link, Navigate, useParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import NewsArticleBody from '../../components/b2b/enrichment/NewsArticleBody'
import { AgentButtonContent } from '../../components/AgentChevron'
import { getNewsArticle, NEWS_CATEGORY_LABELS } from '../../data/siteNews'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function NewsDetailPage() {
  const { slug = '' } = useParams()
  const article = getNewsArticle(slug)

  usePageMeta(
    article
      ? { title: `${article.title} · 积木仓`, description: article.summary, ogImage: article.coverImage }
      : null,
  )

  if (!article) {
    return <Navigate to={ROUTES.news} replace />
  }

  return (
    <MarketingSiteShell pageTitle={article.title} pageEyebrow={NEWS_CATEGORY_LABELS[article.category]} pageLead={article.summary}>
      <div className="enrich-news-meta">
        <span className="enrich-news-date">{article.date}</span>
        <span className="enrich-news-cat">{NEWS_CATEGORY_LABELS[article.category]}</span>
      </div>
      <NewsArticleBody article={article} />
      <div className="enrich-section-foot enrich-detail-actions">
        <Link to={ROUTES.news} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent trailing={false}>返回新闻列表</AgentButtonContent>
        </Link>
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>预约演示</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
