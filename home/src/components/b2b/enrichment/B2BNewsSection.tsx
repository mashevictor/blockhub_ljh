import { Link } from 'react-router-dom'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { NEWS_ARTICLES, NEWS_CATEGORY_LABELS } from '../../../data/siteNews'
import { ROUTES } from '../../../routes/paths'

export default function B2BNewsSection() {
  const latest = NEWS_ARTICLES.slice(0, 3)

  return (
    <section className="enrich-news-section b2b-section" aria-labelledby="enrich-news-title">
      <div className="b2b-section-title">
        <span className="b2b-eyebrow enrich-eyebrow">
          <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
          新闻动态
        </span>
        <h2 id="enrich-news-title">公司在迭代 · 建立 B2B 信任</h2>
        <p>最新 3 条 · 查看全部新闻</p>
      </div>
      <div className="enrich-news-grid">
        {latest.map((item) => (
          <Link
            key={item.slug}
            to={ROUTES.newsDetail(item.slug)}
            className="enrich-news-card"
          >
            <div className="enrich-news-thumb">{NEWS_CATEGORY_LABELS[item.category]}</div>
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
