import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchPlazaFeedComments,
  postPlazaFeedComment,
  togglePlazaFeedLike,
} from '../../api/client'
import { loadPlazaFeedItemsAsync, PLAZA_FEED_UPDATED_EVENT } from '../../lib/plazaFeedStorage'
import type { PlazaFeedItem } from '../../data/plazaMock'
import { feedAppKey, isFeedCreator } from '../../lib/plazaAppUtils'
import PlazaModuleFlowPanel from '../../components/plaza/PlazaModuleFlowPanel'

type FeedFilter = 'latest' | 'hot' | 'mention'

function visLabel(v: PlazaFeedItem['visibility']) {
  if (v === 'public') return { text: '@公开', cls: 'vis-public' }
  if (v === 'dept') return { text: '@部门', cls: 'vis-dept' }
  return { text: '@组织', cls: 'vis-role' }
}

function FeedCard({
  item,
  selected,
  onSelect,
  onInteraction,
}: {
  item: PlazaFeedItem
  selected: boolean
  onSelect: () => void
  onInteraction: () => void
}) {
  const appId = feedAppKey(item)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(item.likes)
  const [comments, setComments] = useState(item.comments)
  const [showComments, setShowComments] = useState(false)
  const [commentRows, setCommentRows] = useState<Array<{ id: string; author: string; text: string }>>([])
  const [commentText, setCommentText] = useState('')
  const [busy, setBusy] = useState(false)
  const vis = visLabel(item.visibility)
  const creator = isFeedCreator(item)

  useEffect(() => {
    setLikes(item.likes)
    setComments(item.comments)
  }, [item.likes, item.comments])

  useEffect(() => {
    if (!showComments || !appId || appId.startsWith('mock-')) return
    void fetchPlazaFeedComments(appId).then(setCommentRows).catch(() => {})
  }, [showComments, appId])

  const handleLike = () => {
    if (!appId || appId.startsWith('mock-')) {
      setLiked((v) => !v)
      setLikes((n) => (liked ? n - 1 : n + 1))
      return
    }
    setBusy(true)
    void togglePlazaFeedLike(appId)
      .then((res) => {
        setLiked(res.liked)
        setLikes(res.likes)
        setComments(res.comments)
        onInteraction()
      })
      .finally(() => setBusy(false))
  }

  const handleComment = () => {
    const text = commentText.trim()
    if (!text) return
    if (!appId || appId.startsWith('mock-')) {
      setCommentRows((prev) => [...prev, { id: `local-${Date.now()}`, author: '我', text }])
      setComments((n) => n + 1)
      setCommentText('')
      return
    }
    setBusy(true)
    void postPlazaFeedComment(appId, text, '访客')
      .then((res) => {
        setComments(res.comments)
        setLikes(res.likes)
        setCommentRows((prev) => [{ id: res.id, author: res.author, text: res.text }, ...prev])
        setCommentText('')
        onInteraction()
      })
      .finally(() => setBusy(false))
  }

  return (
    <article
      className={`plaza-feed-card${selected ? ' selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div className="plaza-feed-head">
        <div className="plaza-feed-avatar">{item.authorInitial}</div>
        <div className="plaza-feed-meta">
          <strong>{item.authorName} · {item.authorMeta}</strong>
          <span>{item.timeLabel} · 通过「描述需求」创建</span>
        </div>
        <span className={`plaza-vis-badge ${vis.cls}`}>{item.atLabel || vis.text}</span>
        {creator && <span className="plaza-creator-badge">创建者</span>}
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
      <div className="plaza-feed-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`plaza-feed-act${liked ? ' liked' : ''}`}
          disabled={busy}
          onClick={handleLike}
        >
          ♥ <span>{likes}</span>
        </button>
        <button type="button" className="plaza-feed-act" onClick={() => setShowComments((v) => !v)}>
          💬 {comments}
        </button>
        <button type="button" className="plaza-feed-act">↗ 转发 {item.reposts}</button>
        <a className="plaza-feed-act open" href={item.webUrl} target="_blank" rel="noreferrer">
          打开应用 →
        </a>
      </div>
      {showComments && (
        <div className="plaza-feed-comments" onClick={(e) => e.stopPropagation()}>
          {commentRows.map((c) => (
            <p key={c.id}><strong>{c.author}</strong> {c.text}</p>
          ))}
          <div className="plaza-feed-comment-form">
            <input
              type="text"
              value={commentText}
              placeholder="写评论…"
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleComment() }}
            />
            <button type="button" className="btn-secondary" disabled={busy || !commentText.trim()} onClick={handleComment}>
              发送
            </button>
          </div>
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
  const [items, setItems] = useState<PlazaFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    void loadPlazaFeedItemsAsync()
      .then((next) => setItems(next))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(PLAZA_FEED_UPDATED_EVENT, refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PLAZA_FEED_UPDATED_EVENT, refresh)
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

  const selected = useMemo(
    () => filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  )

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.some((i) => i.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  return (
    <main className="plaza-main">
      <div className="plaza-main-head">
        <h1>
          <span className="plaza-title-chev" aria-hidden>&gt;&gt;</span>
          应用广场
        </h1>
        <div className="plaza-filters">
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

      <p className="plaza-main-hint">
        浏览所有人 <strong>@公开</strong> 发布的应用；选中卡片可查看该应用的模块数据流（创建者可编辑）。
        {loading && <span> · 加载中…</span>}
      </p>

      {selected ? (
        <PlazaModuleFlowPanel
          appKey={feedAppKey(selected)}
          appName={selected.appName}
          moduleLabels={selected.modules}
          isCreator={isFeedCreator(selected)}
        />
      ) : (
        <div className="plaza-mflow-placeholder">
          <span className="plaza-mflow-chev">&gt;&gt;</span>
          选择下方应用 · 查看模块数据流
        </div>
      )}

      <div className="plaza-feed-list">
        {filtered.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            selected={selected?.id === item.id}
            onSelect={() => setSelectedId(item.id)}
            onInteraction={refresh}
          />
        ))}
      </div>
    </main>
  )
}
