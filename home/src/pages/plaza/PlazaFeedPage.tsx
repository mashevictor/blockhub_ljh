import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchPlazaFeedComments,
  postPlazaFeedComment,
  togglePlazaFeedLike,
} from '../../api/client'
import { loadPlazaFeedItemsAsync, PLAZA_FEED_UPDATED_EVENT } from '../../lib/plazaFeedStorage'
import type { PlazaFeedItem } from '../../data/plazaMock'
import { usePlazaFocus } from '../../context/PlazaFocusContext'
import { feedAppKey, isFeedCreator } from '../../lib/plazaAppUtils'
import PlazaDualRailFlowPanel from '../../components/plaza/PlazaDualRailFlowPanel'

type FeedFilter = 'latest' | 'hot' | 'mention'

function visLabel(v: PlazaFeedItem['visibility']) {
  if (v === 'public') return { text: '@公开', cls: 'vis-public' }
  if (v === 'dept') return { text: '@部门', cls: 'vis-dept' }
  return { text: '@组织', cls: 'vis-role' }
}

function FeedCard({
  item,
  onOpen,
  onInteraction,
}: {
  item: PlazaFeedItem
  onOpen: () => void
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
      className="plaza-feed-card"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`打开应用 ${item.appName}`}
    >
      <div className="plaza-feed-head">
        <div className="plaza-feed-avatar">{item.authorInitial}</div>
        <div className="plaza-feed-meta">
          <strong>
            {item.authorName} · {item.authorMeta}
          </strong>
          <span>{item.timeLabel} · 通过「描述需求」创建</span>
        </div>
        <span className={`plaza-vis-badge ${vis.cls}`}>{item.atLabel || vis.text}</span>
        {creator && <span className="plaza-creator-badge">创建者</span>}
      </div>
      <div className="plaza-feed-app">
        <h4>
          <span className="plaza-at-tag">{item.atLabel}</span> {item.appName}
        </h4>
        <div className="plaza-feed-modules">
          {item.modules.slice(0, 4).map((m) => (
            <span key={m} className="plaza-feed-mod">
              {m}
            </span>
          ))}
          {item.modules.length > 4 ? (
            <span className="plaza-feed-mod plaza-feed-mod-more">+{item.modules.length - 4}</span>
          ) : null}
        </div>
        <p className="plaza-feed-desc">{item.summary}</p>
      </div>
      <div className="plaza-feed-card-foot">
        <span className="plaza-feed-open-hint">
          <span className="plaza-mflow-chev" aria-hidden>
            &gt;&gt;
          </span>{' '}
          进入查看概览
        </span>
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
          <button type="button" className="plaza-feed-act">
            ↗ 转发 {item.reposts}
          </button>
        </div>
      </div>
      {showComments && (
        <div className="plaza-feed-comments" onClick={(e) => e.stopPropagation()}>
          {commentRows.map((c) => (
            <p key={c.id}>
              <strong>{c.author}</strong> {c.text}
            </p>
          ))}
          <div className="plaza-feed-comment-form">
            <input
              type="text"
              value={commentText}
              placeholder="写评论…"
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleComment()
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={busy || !commentText.trim()}
              onClick={handleComment}
            >
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
  /** 仅用户点进某应用后才有值；列表态不自动选中第一项 */
  const [openedId, setOpenedId] = useState<string | null>(null)
  const { setFocus } = usePlazaFocus()

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

  const opened = useMemo(
    () => (openedId ? filtered.find((i) => i.id === openedId) ?? null : null),
    [filtered, openedId],
  )

  useEffect(() => {
    if (openedId && !filtered.some((i) => i.id === openedId)) {
      setOpenedId(null)
    }
  }, [filtered, openedId])

  useEffect(() => {
    if (!opened) {
      setFocus(null)
      return
    }
    setFocus({
      appKey: feedAppKey(opened),
      appName: opened.appName,
      webUrl: opened.webUrl,
      moduleCount: opened.modules.length,
      moduleLabels: opened.modules,
      plazaLabel: opened.atLabel,
      isCreator: isFeedCreator(opened),
      source: 'feed',
    })
  }, [opened, setFocus])

  const backToList = () => setOpenedId(null)

  if (opened) {
    return (
      <main className="plaza-main plaza-main--detail">
        <div className="plaza-detail-bar">
          <button type="button" className="plaza-detail-back" onClick={backToList}>
            ← 返回列表
          </button>
          <div className="plaza-detail-title">
            <span className="plaza-at-tag">{opened.atLabel}</span>
            <strong>{opened.appName}</strong>
          </div>
          <a
            className="plaza-detail-open"
            href={opened.webUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            打开应用
          </a>
        </div>
        <p className="plaza-main-hint plaza-main-hint--full">
          功能与数据轨为只读概览；改模块请打开 Runtime。底部可流程预览（本地动画）。
        </p>
        <p className="plaza-main-hint plaza-main-hint--short">本应用概览 · 只读 · 改页进 Runtime</p>
        <PlazaDualRailFlowPanel
          appKey={feedAppKey(opened)}
          appName={opened.appName}
          moduleLabels={opened.modules}
          isCreator={isFeedCreator(opened)}
          embedded
          webUrl={opened.webUrl}
        />
      </main>
    )
  }

  return (
    <main className="plaza-main plaza-main--list">
      <div className="plaza-main-head">
        <h1>
          <span className="plaza-title-chev" aria-hidden>
            &gt;&gt;
          </span>
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

      <p className="plaza-main-hint plaza-main-hint--full">
        浏览公开应用列表；点进某个应用后，再查看只读功能/数据概览。
        {loading && <span> · 加载中…</span>}
      </p>
      <p className="plaza-main-hint plaza-main-hint--short">
        先列表 · 点进应用看概览
        {loading && <span> · 加载中…</span>}
      </p>

      <div className="plaza-feed-list">
        {!loading && filtered.length === 0 && (
          <p className="plaza-main-hint">
            暂无 @公开 应用。在首页创建应用并发布到应用广场后，将显示在这里。
          </p>
        )}
        {filtered.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            onOpen={() => setOpenedId(item.id)}
            onInteraction={refresh}
          />
        ))}
      </div>
    </main>
  )
}
