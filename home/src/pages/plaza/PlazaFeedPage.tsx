import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadPlazaFeedItems } from '../../lib/plazaFeedStorage'
import type { PlazaFeedItem } from '../../data/plazaMock'
import {
  buildBarrageTags,
  getPlazaDataFlowSnapshot,
  splitIntoRails,
} from '../../lib/plazaBarrage'
import PlazaBarrageRail from '../../components/plaza/PlazaBarrageRail'
import PlazaDataFlowPanel from '../../components/plaza/PlazaDataFlowPanel'

type FeedFilter = 'latest' | 'hot' | 'mention'

function visLabel(v: PlazaFeedItem['visibility']) {
  if (v === 'public') return { text: '@公开', cls: 'vis-public' }
  if (v === 'dept') return { text: '@部门', cls: 'vis-dept' }
  return { text: '@组织', cls: 'vis-role' }
}

function FeedCard({
  item,
  selected,
  compact,
}: {
  item: PlazaFeedItem
  selected: boolean
  compact: boolean
}) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(item.likes)
  const [showComments, setShowComments] = useState(false)
  const vis = visLabel(item.visibility)

  if (compact && !selected) {
    return (
      <article className="plaza-rail-item dimmed" aria-label={`${item.appName} 未选中`}>
        <span className="plaza-rail-item-chev dimmed" aria-hidden>&gt;&gt;</span>
        <div>
          <strong>{item.atLabel} {item.appName}</strong>
          <span className="plaza-rail-item-hint">未选中 · 点击上方弹幕激活</span>
        </div>
      </article>
    )
  }

  if (compact && selected) {
    return (
      <article className="plaza-rail-item selected">
        <span className="plaza-rail-item-chev" aria-hidden>&gt;&gt;</span>
        <div className="plaza-rail-item-body">
          <strong>{item.atLabel} {item.appName}</strong>
          <span className="plaza-rail-item-meta">
            {item.timeLabel} · {item.modules.join(' · ')} · ♥ {likes} 💬 {item.comments}
          </span>
          <p className="plaza-rail-item-desc">{item.summary}</p>
          <div className="plaza-feed-actions plaza-feed-actions--rail">
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
            <div className="plaza-feed-comments plaza-feed-comments--rail">
              {item.commentPreview.map((c) => (
                <p key={c.author}><strong>{c.author}</strong> {c.text}</p>
              ))}
              <p className="plaza-feed-comments-note">评论 API 开发中（W4）</p>
            </div>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className={`plaza-feed-card plaza-feed-card--rail${selected ? ' selected' : ''}`}>
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

const FILTER_LABELS: Record<FeedFilter, string> = {
  latest: '最新',
  hot: '热门',
  mention: '@我',
}

export default function PlazaFeedPage() {
  const [filter, setFilter] = useState<FeedFilter>('latest')
  const [items, setItems] = useState(() => loadPlazaFeedItems())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => setItems(loadPlazaFeedItems()), [])

  useEffect(() => {
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  const filtered = useMemo(() => {
    if (filter === 'hot') return [...items].sort((a, b) => b.likes - a.likes)
    if (filter === 'mention') {
      return items.filter((i) => i.authorName === '我' || i.atLabel.includes('@'))
    }
    return items
  }, [items, filter])

  const { rail1, rail2 } = useMemo(() => splitIntoRails(filtered), [filtered])
  const rail1Tags = useMemo(() => buildBarrageTags(rail1, 0), [rail1])
  const rail2Tags = useMemo(() => buildBarrageTags(rail2, 1), [rail2])
  const snapshot = useMemo(() => getPlazaDataFlowSnapshot(filtered), [filtered])

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.some((i) => i.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const handleSelect = (itemId: string) => {
    setSelectedId(itemId)
    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <main className="plaza-main plaza-main--rail">
      <div className="plaza-main-head">
        <h1>
          <span className="plaza-title-chev" aria-hidden>&gt;&gt;</span>
          广场 · Newsfeed
        </h1>
        <div className="plaza-filters plaza-filters--rail">
          {(['latest', 'hot', 'mention'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={filter === key ? 'on' : ''}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <PlazaDataFlowPanel
        snapshot={snapshot}
        selectedId={selectedId}
        filterLabel={FILTER_LABELS[filter]}
      />

      <section className="plaza-rail-stage" aria-label="弹幕双轨广场">
        <PlazaBarrageRail
          tags={rail1Tags}
          selectedId={selectedId}
          onSelect={handleSelect}
          label="轨1 · 公开与组织"
        />
        <PlazaBarrageRail
          tags={rail2Tags}
          selectedId={selectedId}
          onSelect={handleSelect}
          dimmed
          label="轨2 · 部门范围"
        />
        <p className="plaza-rail-hint">↓ 点击上方弹幕 · 展开 Feed 详情</p>
      </section>

      <div className="plaza-rail-feed" ref={feedRef}>
        {filtered.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            compact
          />
        ))}
      </div>
    </main>
  )
}
