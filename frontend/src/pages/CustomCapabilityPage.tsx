import { useEffect, useMemo, useState } from 'react'
import {
  fetchCustomCapabilities,
  reviewCustomCapability,
  type CustomCapabilityItem,
} from '../api/client'

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  all: { label: '全部', class: '' },
  pending: { label: '待审核', class: 'tag-warn' },
  approved: { label: '已通过', class: 'tag-ok' },
  rejected: { label: '已拒绝', class: 'tag-no' },
}

export default function CustomCapabilityPage() {
  const [filter, setFilter] = useState('pending')
  const [items, setItems] = useState<CustomCapabilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetchCustomCapabilities(filter === 'all' ? undefined : filter)
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [filter])

  const counts = useMemo(() => {
    const pending = items.filter((i) => i.status === 'pending').length
    const approved = items.filter((i) => i.status === 'approved').length
    const rejected = items.filter((i) => i.status === 'rejected').length
    return { pending, approved, rejected, total: items.length }
  }, [items])

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setActingId(id)
    try {
      await reviewCustomCapability(id, action)
      load()
    } finally {
      setActingId(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>能力审核</h1>
        <p>审核用户提交的自定义能力提案，通过后可在创建流程与模块推荐中使用</p>
      </div>

      <div className="summary-pills">
        <div className="summary-pill">
          <div className="n">{filter === 'pending' ? items.length : counts.pending || '—'}</div>
          <div className="l">待审核</div>
        </div>
        <div className="summary-pill">
          <div className="n">{filter === 'approved' ? items.length : counts.approved || '—'}</div>
          <div className="l">已通过</div>
        </div>
        <div className="summary-pill">
          <div className="n">{filter === 'rejected' ? items.length : counts.rejected || '—'}</div>
          <div className="l">已拒绝</div>
        </div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {Object.entries(STATUS_MAP).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            className={`filter-tab${filter === key ? ' active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
            {key !== 'all' && filter === key ? items.length : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 24, color: 'var(--muted)' }}>加载中…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 24, color: 'var(--muted)' }}>
          {filter === 'pending' ? '暂无待审核的能力提案' : '暂无记录'}
        </div>
      ) : (
        <div className="approval-list">
          {items.map((cap) => (
            <div key={cap.id} className="approval-card">
              <div className="approval-card-head">
                <strong>{cap.name}</strong>
                <span className={STATUS_MAP[cap.status]?.class ?? ''}>
                  {STATUS_MAP[cap.status]?.label ?? cap.status}
                </span>
              </div>
              <div className="approval-card-body">
                <span>
                  <code style={{ fontSize: '0.85em' }}>{cap.key}</code>
                  {' · '}
                  {cap.category}
                </span>
                {cap.description ? <span>{cap.description}</span> : null}
                {cap.keywords.length > 0 ? (
                  <span style={{ color: 'var(--muted)' }}>
                    关键词：{cap.keywords.join('、')}
                  </span>
                ) : null}
                <span style={{ color: 'var(--muted)' }}>{cap.created_at}</span>
              </div>
              {cap.status === 'pending' && (
                <div className="approval-actions">
                  <button
                    type="button"
                    className="btn btn-primary-dark"
                    disabled={actingId === cap.id}
                    onClick={() => void handleReview(cap.id, 'approve')}
                  >
                    {actingId === cap.id ? '处理中…' : '通过'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost-dark"
                    disabled={actingId === cap.id}
                    onClick={() => void handleReview(cap.id, 'reject')}
                  >
                    拒绝
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
