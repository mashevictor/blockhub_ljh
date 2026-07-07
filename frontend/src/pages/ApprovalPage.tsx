import { useEffect, useState } from 'react'
import {
  approvalAction,
  fetchApprovalStats,
  fetchApprovals,
  submitApproval,
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
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'leave', department: '', summary: '' })

  const load = () => {
    fetchApprovalStats().then(setStats)
    fetchApprovals(filter === 'all' ? undefined : filter).then(setItems)
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await approvalAction(id, action)
    load()
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      await submitApproval({
        title: form.title.trim(),
        type: form.type,
        department: form.department.trim(),
        summary: form.summary.trim() || form.title.trim(),
      })
      setForm({ title: '', type: 'leave', department: '', summary: '' })
      setShowSubmit(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1>审批中心</h1>
          <p>处理请假、报销等各类申请的提交、审批与归档</p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={() => setShowSubmit((v) => !v)}>
          {showSubmit ? '取消' : '发起申请'}
        </button>
      </div>

      {showSubmit && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>新建审批申请</h3>
          <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <label>
              标题
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例如：年假申请 3 天"
              />
            </label>
            <label>
              类型
              <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="leave">请假</option>
                <option value="expense">报销</option>
                <option value="general">通用</option>
              </select>
            </label>
            <label>
              部门
              <input
                className="input"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="例如：研发部"
              />
            </label>
            <label>
              说明
              <textarea
                className="input"
                rows={3}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="补充申请事由"
              />
            </label>
            <div>
              <button type="button" className="btn btn-primary-dark" disabled={submitting || !form.title.trim()} onClick={() => void handleSubmit()}>
                {submitting ? '提交中…' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}

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
