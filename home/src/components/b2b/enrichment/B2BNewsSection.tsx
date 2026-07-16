import { Link } from 'react-router-dom'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { NEWS_ARTICLES, NEWS_CATEGORY_LABELS } from '../../../data/siteNews'
import { ROUTES } from '../../../routes/paths'
import { staticUrl } from '../../../lib/staticUrl'
import LazyCover from '../../LazyCover'

export default function B2BNewsSection() {
  const latest = NEWS_ARTICLES.slice(0, 3)

  return (
    <section className="enrich-news-section b2b-section" aria-labelledby="enrich-news-title">
      <div className="b2b-section-title">
        <span className="b2b-eyebrow enrich-eyebrow">
          <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
          新闻动态
        </span>
        <h2 id="enrich-news-title">最新动态</h2>
        <p>产品发布 · 企业新闻 · 品牌活动</p>
      </div>
      <div className="enrich-news-grid">
        {latest.map((item) => (
          <Link
            key={item.slug}
            to={ROUTES.newsDetail(item.slug)}
            className="enrich-news-card"
          >
            <LazyCover
              className="enrich-news-thumb enrich-news-thumb--photo"
              src={staticUrl(item.coverImage)}
              alt={item.title}
            />
            <div className="enrich-news-body">
              <span className="enrich-news-cat">{NEWS_CATEGORY_LABELS[item.category]}</span>
              <h4>{item.title}</h4>
              <span className="enrich-news-date">{item.date}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="enrich-section-foot">
        <Link to={ROUTES.news} className="enrich-link-btn agent-action-btn">
          <AgentButtonContent>查看全部新闻</AgentButtonContent>
        </Link>
      </div>
    </section>
  )
}
