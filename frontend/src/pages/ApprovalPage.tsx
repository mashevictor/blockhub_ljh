import { useEffect, useState } from 'react'
import {
  approvalAction,
  fetchApprovalStats,
  fetchApprovals,
  type ApprovalItem,
} from '../api/client'

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  all: { label: '全部', class: '' },
  pending: { label: '审批中', class: 'tag-warn' },
  approved: { label: '已通过', class: 'tag-ok' },
  rejected: { label: '已拒绝', class: 'tag-no' },
}

export default function ApprovalPage() {
  const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number } | null>(null)
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState<ApprovalItem[]>([])

  const load = () => {
    fetchApprovalStats().then(setStats)
    fetchApprovals(filter === 'all' ? undefined : filter).then(setItems)
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await approvalAction(id, action)
    load()
  }

  return (
    <>
      <div className="page-header">
        <h1>审批中心</h1>
        <p>处理请假、报销等各类申请的提交、审批与归档</p>
      </div>

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{stats?.pending ?? '—'}</div><div className="l">待审批</div></div>
        <div className="summary-pill"><div className="n">{stats?.approved ?? '—'}</div><div className="l">已通过</div></div>
        <div className="summary-pill"><div className="n">{stats?.rejected ?? '—'}</div><div className="l">已拒绝</div></div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {Object.entries(STATUS_MAP).map(([key, { label }]) => (
          <button key={key} type="button" className={`filter-tab${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
            {label}{key !== 'all' ? stats?.[key as keyof typeof stats] ?? 0 : items.length}
          </button>
        ))}
      </div>

      <div className="approval-list">
        {items.map((a) => (
          <div key={a.id} className="approval-card">
            <div className="approval-card-head">
              <strong>{a.title}</strong>
              <span className={STATUS_MAP[a.status]?.class ?? ''}>{STATUS_MAP[a.status]?.label ?? a.status}</span>
            </div>
            <div className="approval-card-body">
              <span>{a.applicant} · {a.department}</span>
              <span>{a.summary}</span>
              <span style={{ color: 'var(--muted)' }}>{a.submitted_at}</span>
            </div>
            {a.status === 'pending' && (
              <div className="approval-actions">
                <button type="button" className="btn btn-primary-dark" onClick={() => handleAction(a.id, 'approve')}>通过</button>
                <button type="button" className="btn btn-ghost-dark" onClick={() => handleAction(a.id, 'reject')}>拒绝</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
