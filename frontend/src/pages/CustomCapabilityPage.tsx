import { useEffect, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
  const [filter, setFilter] = useState('pending')
  const [items, setItems] = useState<CustomCapabilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchCustomCapabilities(filter === 'all' ? undefined : filter)
      .then((res) => {
        setItems(res.items)
        setSelectedId((prev) => {
          if (prev && res.items.some((i) => i.id === prev)) return prev
          return res.items[0]?.id ?? null
        })
      })
      .catch((e: unknown) => {
        setItems([])
        setSelectedId(null)
        setError(e instanceof Error ? e.message : '加载失败')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [filter])

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  )

  const counts = useMemo(() => {
    const pending = items.filter((i) => i.status === 'pending').length
    const approved = items.filter((i) => i.status === 'approved').length
    const rejected = items.filter((i) => i.status === 'rejected').length
    return { pending, approved, rejected, total: items.length }
  }, [items])

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setActingId(id)
    setError(null)
    try {
      await reviewCustomCapability(id, action)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '审核失败')
    } finally {
      setActingId(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>能力审核</h1>
        <p>审核用户提交的自定义能力提案；通过后写入有效注册表，可在创建与模块推荐中使用</p>
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
            {key !== 'all' && filter === key ? ` ${items.length}` : ''}
          </button>
        ))}
      </div>

      {error ? (
        <div className="card" style={{ padding: 12, marginBottom: 12, color: 'var(--danger, #b91c1c)' }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card" style={{ padding: 24, color: 'var(--muted)' }}>{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 24, color: 'var(--muted)' }}>
          {filter === 'pending' ? '暂无待审核的能力提案（空库为空列表）' : '暂无记录'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px,360px)', gap: 16 }}>
          <div className="approval-list">
            {items.map((cap) => (
              <button
                key={cap.id}
                type="button"
                className="approval-card"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: selectedId === cap.id ? 'var(--accent, #2563eb)' : undefined,
                }}
                onClick={() => setSelectedId(cap.id)}
              >
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
                  <span style={{ color: 'var(--muted)' }}>{cap.created_at}</span>
                </div>
              </button>
            ))}
          </div>

          <aside className="card" style={{ padding: 16, alignSelf: 'start', position: 'sticky', top: 12 }}>
            {selected ? (
              <>
                <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>{selected.name}</h2>
                <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 13 }}>
                  提案详情 · {STATUS_MAP[selected.status]?.label ?? selected.status}
                </p>
                <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13 }}>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>capability key</dt>
                    <dd style={{ margin: 0 }}>
                      <code>{selected.key}</code>
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>分类</dt>
                    <dd style={{ margin: 0 }}>{selected.category || '—'}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>描述</dt>
                    <dd style={{ margin: 0 }}>{selected.description || '—'}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>关键词</dt>
                    <dd style={{ margin: 0 }}>
                      {selected.keywords.length ? selected.keywords.join('、') : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>提案人</dt>
                    <dd style={{ margin: 0 }}>
                      <code style={{ fontSize: '0.85em' }}>{selected.proposed_by_id || '—'}</code>
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>提交时间</dt>
                    <dd style={{ margin: 0 }}>{selected.created_at || '—'}</dd>
                  </div>
                </dl>
                {selected.status === 'pending' ? (
                  <div className="approval-actions" style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-primary-dark"
                      disabled={actingId === selected.id}
                      onClick={() => void handleReview(selected.id, 'approve')}
                    >
                      {actingId === selected.id ? '处理中…' : '通过'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost-dark"
                      disabled={actingId === selected.id}
                      onClick={() => void handleReview(selected.id, 'reject')}
                    >
                      拒绝
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p style={{ color: 'var(--muted)', margin: 0 }}>选择左侧提案查看详情</p>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
