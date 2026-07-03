import { useMemo, useState } from 'react'
import { loadPlazaFeedItems } from '../../lib/plazaFeedStorage'
import type { PlazaFeedItem } from '../../data/plazaMock'

type FeedFilter = 'latest' | 'hot' | 'mention'

function visLabel(v: PlazaFeedItem['visibility']) {
  if (v === 'public') return { text: '@公开', cls: 'vis-public' }
  if (v === 'dept') return { text: '@部门', cls: 'vis-dept' }
  return { text: '@组织', cls: 'vis-role' }
}

function FeedCard({ item }: { item: PlazaFeedItem }) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(item.likes)
  const [showComments, setShowComments] = useState(false)
  const vis = visLabel(item.visibility)

  return (
    <article className="plaza-feed-card">
      <div className="plaza-feed-head">
        <div className="plaza-feed-avatar">{item.authorInitial}</div>
        <div className="plaza-feed-meta">
          <strong>{item.authorName} · {item.authorMeta}</strong>
          <span>{item.timeLabel} · 通过「描述需求」创建</span>
        </div>
        <span className={`plaza-vis-badge ${vis.cls}`}>{item.atLabel || vis.text}</span>
      </div>
      <div className="plaza-feed-app">
        <h4><span className="plaza-at-tag">{item.atLabel}</span> {item.appName}</h4>
        <div className="plaza-feed-modules">
          {item.modules.map((m) => (
            <span key={m} className="plaza-feed-mod">{m}</span>
          ))}
        </div>
        <p className="plaza-feed-desc">{item.summary}</p>
      </div>
      <div className="plaza-feed-actions">
        <button
          type="button"
          className={`plaza-feed-act${liked ? ' liked' : ''}`}
          onClick={() => {
            setLiked((v) => !v)
            setLikes((n) => (liked ? n - 1 : n + 1))
          }}
        >
          ♥ <span>{likes}</span>
        </button>
        <button type="button" className="plaza-feed-act" onClick={() => setShowComments((v) => !v)}>
          💬 {item.comments}
        </button>
        <button type="button" className="plaza-feed-act">↗ 转发 {item.reposts}</button>
        <a className="plaza-feed-act open" href={item.webUrl} target="_blank" rel="noreferrer">
          打开应用 →
        </a>
      </div>
      {showComments && item.commentPreview && (
        <div className="plaza-feed-comments">
          {item.commentPreview.map((c) => (
            <p key={c.author}><strong>{c.author}</strong> {c.text}</p>
          ))}
          <p className="plaza-feed-comments-note">评论 API 开发中（W4）</p>
        </div>
      )}
    </article>
  )
}

export default function PlazaFeedPage() {
  const [filter, setFilter] = useState<FeedFilter>('latest')
  const items = useMemo(() => loadPlazaFeedItems(), [])

  const filtered = useMemo(() => {
    if (filter === 'hot') {
      return [...items].sort((a, b) => b.likes - a.likes)
    }
    if (filter === 'mention') {
      return items.filter((i) => i.authorName === '我' || i.atLabel.includes('@'))
    }
    return items
  }, [items, filter])

  return (
    <main className="plaza-main">
      <div className="plaza-main-head">
        <h1>广场 · Newsfeed</h1>
        <div className="plaza-filters">
          {(['latest', 'hot', 'mention'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={filter === key ? 'on' : ''}
              onClick={() => setFilter(key)}
            >
              {key === 'latest' ? '最新' : key === 'hot' ? '热门' : '@我'}
            </button>
          ))}
        </div>
      </div>
      <p className="plaza-main-hint">
        选 <code>@公开</code> 发布的应用会出现在这里；点赞 / 评论 / 转发将在 W4 接 PostgreSQL。
      </p>
      {filtered.map((item) => (
        <FeedCard key={item.id} item={item} />
      ))}
    </main>
  )
}
