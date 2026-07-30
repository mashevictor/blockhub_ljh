import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  approvalAction,
  fetchApprovalStats,
  fetchApprovals,
  submitApproval,
  type ApprovalItem,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { isTenantAdmin } from '../lib/roles'

export default function ApprovalPage() {
  const t = useT()
  const STATUS_MAP: Record<string, { label: string; class: string }> = {
    all: { label: t('admin.status.all'), class: '' },
    pending: { label: t('admin.status.pending'), class: 'tag-warn' },
    approved: { label: t('admin.status.approved'), class: 'tag-ok' },
    rejected: { label: t('admin.status.rejected'), class: 'tag-no' },
  }
  const { user, role } = useAuth()
  const canApprove = isTenantAdmin(user?.role ?? role)
  const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number } | null>(null)
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [form, setForm] = useState({ title: '', type: 'leave', department: '', summary: '' })

  const load = () => {
    fetchApprovalStats().then(setStats)
    fetchApprovals(filter === 'all' ? undefined : filter).then(setItems)
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!canApprove) {
      setActionError(t('admin.err.approve_forbidden'))
      return
    }
    setActionError('')
    try {
      await approvalAction(id, action)
      load()
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setActionError(typeof detail === 'string' ? detail : t('admin.err.approve_failed'))
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setSubmitting(true)
    setActionError('')
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
          <h1>{t('admin.page.approvals.title')}</h1>
          <p>
            {canApprove
              ? t('admin.page.approvals.desc_admin')
              : t('admin.page.approvals.desc_user')}
          </p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={() => setShowSubmit((v) => !v)}>
          {showSubmit ? t('common.cancel') : t('admin.approvals.new_request')}
        </button>
      </div>

      {actionError ? <p style={{ color: 'var(--danger, #b91c1c)', marginBottom: 12 }}>{actionError}</p> : null}

      {showSubmit && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>{t('admin.approvals.form.title')}</h3>
          <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <label>
              {t('admin.approvals.form.field.title')}
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('admin.approvals.form.field.title_ph')}
              />
            </label>
            <label>
              {t('admin.approvals.form.field.type')}
              <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="leave">{t('admin.approvals.type.leave')}</option>
                <option value="expense">{t('admin.approvals.type.expense')}</option>
                <option value="general">{t('admin.approvals.type.general')}</option>
              </select>
            </label>
            <label>
              {t('admin.approvals.form.field.department')}
              <input
                className="input"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder={t('admin.approvals.form.field.department_ph')}
              />
            </label>
            <label>
              {t('admin.approvals.form.field.summary')}
              <textarea
                className="input"
                rows={3}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder={t('admin.approvals.form.field.summary_ph')}
              />
            </label>
            <div>
              <button type="button" className="btn btn-primary-dark" disabled={submitting || !form.title.trim()} onClick={() => void handleSubmit()}>
                {submitting ? t('common.submitting') : t('admin.action.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{stats?.pending ?? '—'}</div><div className="l">{t('admin.approvals.stat.pending')}</div></div>
        <div className="summary-pill"><div className="n">{stats?.approved ?? '—'}</div><div className="l">{t('admin.approvals.stat.approved')}</div></div>
        <div className="summary-pill"><div className="n">{stats?.rejected ?? '—'}</div><div className="l">{t('admin.approvals.stat.rejected')}</div></div>
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
            {a.status === 'pending' && canApprove && (
              <div className="approval-actions">
                <button type="button" className="btn btn-primary-dark" onClick={() => void handleAction(a.id, 'approve')}>{t('admin.action.approve')}</button>
                <button type="button" className="btn btn-ghost-dark" onClick={() => void handleAction(a.id, 'reject')}>{t('admin.action.reject')}</button>
              </div>
            )}
            {a.status === 'pending' && !canApprove && (
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>{t('admin.approvals.waiting_admin')}</p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
