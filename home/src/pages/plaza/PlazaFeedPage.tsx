import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadPlazaFeedItems } from '../../lib/plazaFeedStorage'
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
}: {
  item: PlazaFeedItem
  selected: boolean
  onSelect: () => void
}) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(item.likes)
  const [showComments, setShowComments] = useState(false)
  const vis = visLabel(item.visibility)
  const creator = isFeedCreator(item)

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
        <div className="plaza-feed-comments" onClick={(e) => e.stopPropagation()}>
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
          />
        ))}
      </div>
    </main>
  )
}
