import { useEffect, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  fetchCustomCapabilities,
  reviewCustomCapability,
  type CustomCapabilityItem,
} from '../api/client'

export default function CustomCapabilityPage() {
  const t = useT()
  const STATUS_MAP: Record<string, { label: string; class: string }> = {
    all: { label: t('admin.status.all'), class: '' },
    pending: { label: t('admin.status.review_pending'), class: 'tag-warn' },
    approved: { label: t('admin.status.approved'), class: 'tag-ok' },
    rejected: { label: t('admin.status.rejected'), class: 'tag-no' },
  }
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
        setError(e instanceof Error ? e.message : t('admin.err.load_failed'))
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
      setError(e instanceof Error ? e.message : t('admin.err.review_failed'))
    } finally {
      setActingId(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>{t('admin.page.review.title')}</h1>
        <p>{t('admin.page.review.desc')}</p>
      </div>

      <div className="summary-pills">
        <div className="summary-pill">
          <div className="n">{filter === 'pending' ? items.length : counts.pending || '—'}</div>
          <div className="l">{t('admin.status.review_pending')}</div>
        </div>
        <div className="summary-pill">
          <div className="n">{filter === 'approved' ? items.length : counts.approved || '—'}</div>
          <div className="l">{t('admin.status.approved')}</div>
        </div>
        <div className="summary-pill">
          <div className="n">{filter === 'rejected' ? items.length : counts.rejected || '—'}</div>
          <div className="l">{t('admin.status.rejected')}</div>
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
          {filter === 'pending' ? t('admin.page.review.empty_pending') : t('admin.page.review.empty')}
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
                  {t('admin.page.review.detail', {
                    status: STATUS_MAP[selected.status]?.label ?? selected.status,
                  })}
                </p>
                <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13 }}>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>capability key</dt>
                    <dd style={{ margin: 0 }}>
                      <code>{selected.key}</code>
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>{t('admin.page.review.field.category')}</dt>
                    <dd style={{ margin: 0 }}>{selected.category || '—'}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>{t('admin.page.review.field.description')}</dt>
                    <dd style={{ margin: 0 }}>{selected.description || '—'}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>{t('admin.page.review.field.keywords')}</dt>
                    <dd style={{ margin: 0 }}>
                      {selected.keywords.length ? selected.keywords.join('、') : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>{t('admin.page.review.field.proposer')}</dt>
                    <dd style={{ margin: 0 }}>
                      <code style={{ fontSize: '0.85em' }}>{selected.proposed_by_id || '—'}</code>
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--muted)' }}>{t('admin.page.review.field.submitted')}</dt>
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
                      {actingId === selected.id ? t('admin.page.review.acting') : t('admin.action.approve')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost-dark"
                      disabled={actingId === selected.id}
                      onClick={() => void handleReview(selected.id, 'reject')}
                    >
                      {t('admin.action.reject')}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p style={{ color: 'var(--muted)', margin: 0 }}>{t('admin.page.review.pick')}</p>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
