import { useEffect, useState } from 'react'
import { apiFetch, useRuntime } from '@blockhub/web-core'
import type { SchemaNode } from '@blockhub/web-core'

interface ApprovalItem {
  id: string
  title: string
  applicant: string
  department: string
  status: string
  summary: string
  submitted_at: string
}

export function FormWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, user } = useRuntime()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [department, setDepartment] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/approvals', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          type: String(node.props?.approval_type || 'general'),
          department: department.trim() || '未填写',
          summary: summary.trim() || title.trim(),
        }),
      })
      setMsg('申请已提交，等待审批')
      setTitle('')
      setSummary('')
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="widget form-widget">
      <h3>发起{String(node.props?.capability_key || '审批')}</h3>
      <p className="muted">当前用户：{user.display_name}</p>
      <label>
        标题
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请假 / 报销 / 用印…" />
      </label>
      <label>
        部门
        <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="研发部" />
      </label>
      <label>
        说明
        <textarea className="input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </label>
      <button type="button" className="btn" style={{ background: primaryColor }} disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? '提交中…' : '提交申请'}
      </button>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}

export function ApprovalInboxWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, user } = useRuntime()
  const [items, setItems] = useState<ApprovalItem[]>([])
  const isAdmin = user.role === 'admin'

  const load = () => {
    apiFetch<{ items: ApprovalItem[] }>('/api/v1/approvals?status=pending', token)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
  }

  useEffect(() => { load() }, [token])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await apiFetch(`/api/v1/approvals/${id}/action`, token, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    load()
  }

  return (
    <div className="widget inbox-widget">
      <h3>待办中心</h3>
      {!isAdmin && <p className="muted">管理员账号可在此审批；员工账号可查看自己的待办。</p>}
      {items.length === 0 && <p className="muted">暂无待审批项</p>}
      {items.map((a) => (
        <div key={a.id} className="list-card">
          <div className="list-card-head">
            <strong>{a.title}</strong>
            <span className="tag">{a.status}</span>
          </div>
          <p>{a.applicant} · {a.department}</p>
          <p className="muted">{a.summary}</p>
          {isAdmin && a.status === 'pending' && (
            <div className="row-actions">
              <button type="button" className="btn" style={{ background: primaryColor }} onClick={() => void handleAction(a.id, 'approve')}>通过</button>
              <button type="button" className="btn btn-ghost" onClick={() => void handleAction(a.id, 'reject')}>拒绝</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function ListWidget({ node }: { node: SchemaNode }) {
  if (node.props?.capability_key === 'approval_inbox') {
    return <ApprovalInboxWidget node={node} />
  }
  const { token } = useRuntime()
  const [items, setItems] = useState<ApprovalItem[]>([])

  useEffect(() => {
    apiFetch<{ items: ApprovalItem[] }>('/api/v1/approvals', token)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
  }, [token])

  return (
    <div className="widget list-widget">
      <h3>{String(node.props?.capability_key || '列表')}</h3>
      {items.map((a) => (
        <div key={a.id} className="list-card">
          <strong>{a.title}</strong>
          <span className="muted"> · {a.status} · {a.submitted_at}</span>
        </div>
      ))}
    </div>
  )
}
