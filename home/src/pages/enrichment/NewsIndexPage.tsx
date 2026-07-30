import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent } from '../../components/AgentChevron'
import { NEWS_ARTICLES } from '../../data/siteNews'
import { enrichCardStyle, NEWS_CATEGORY_THEMES } from '../../data/enrichVisualThemes'
import { localizeNewsArticle, newsCategoryLabel } from '../../i18n/contentLabels'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function NewsIndexPage() {
  const t = useT()
  usePageMeta({
    title: `${t('home.enrich.news.title')} · BlockHub`,
    description: t('home.enrich.news.lead'),
  })

  return (
    <MarketingSiteShell
      pageTitle={t('home.enrich.news.title')}
      pageEyebrow={t('home.enrich.news.eyebrow')}
      pageLead={t('home.enrich.news.lead')}
    >
      <div className="enrich-news-list">
        {NEWS_ARTICLES.map((raw) => {
          const item = localizeNewsArticle(t, raw)
          const theme = NEWS_CATEGORY_THEMES[item.category]
          const catLabel = newsCategoryLabel(t, item.category)
          return (
            <article
              key={item.slug}
              className="enrich-card enrich-news-list-card"
              style={enrichCardStyle(theme) as CSSProperties}
            >
              <EnrichCardVisual
                icon={theme.icon}
                label={catLabel}
                sublabel={item.date}
                imageUrl={item.coverImage}
                photoOverlay="badge"
              />
              <div className="enrich-card-body">
                <span className="enrich-news-cat">{catLabel}</span>
                <h2>
                  <Link to={ROUTES.newsDetail(item.slug)}>{item.title}</Link>
                </h2>
                <p>{item.summary}</p>
                <Link to={ROUTES.newsDetail(item.slug)} className="enrich-link-btn agent-action-btn">
                  <AgentButtonContent>{t('home.enrich.news.read')}</AgentButtonContent>
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </MarketingSiteShell>
  )
}
