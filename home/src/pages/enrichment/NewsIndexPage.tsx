import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { NEWS_ARTICLES, NEWS_CATEGORY_LABELS } from '../../data/siteNews'
import { enrichCardStyle, NEWS_CATEGORY_THEMES } from '../../data/enrichVisualThemes'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function NewsIndexPage() {
  usePageMeta({
    title: '新闻动态 · 积木仓',
    description: '产品发布、客户动态与行业洞察',
  })

  return (
    <MarketingSiteShell
      pageTitle="新闻动态"
      pageEyebrow="公司动态"
      pageLead={`公司在迭代 · 建立 B2B 信任 · 最新 ${NEWS_ARTICLES.length} 条`}
    >
      <div className="enrich-news-list">
        {NEWS_ARTICLES.map((item) => {
          const theme = NEWS_CATEGORY_THEMES[item.category]
          const catLabel = NEWS_CATEGORY_LABELS[item.category]
          return (
            <article
              key={item.slug}
              className="enrich-card enrich-news-list-card"
              style={enrichCardStyle(theme) as CSSProperties}
            >
              <EnrichCardVisual icon={theme.icon} label={catLabel} sublabel={item.date} />
              <div className="enrich-card-body">
                <span className="enrich-news-cat">{catLabel}</span>
                <h2>
                  <Link to={ROUTES.newsDetail(item.slug)}>{item.title}</Link>
                </h2>
                <p>{item.summary}</p>
                <Link to={ROUTES.newsDetail(item.slug)} className="enrich-link-btn agent-action-btn">
                  <AgentButtonContent>阅读全文</AgentButtonContent>
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </MarketingSiteShell>
  )
}
