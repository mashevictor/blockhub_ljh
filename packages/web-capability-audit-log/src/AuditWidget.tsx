import { useEffect, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface AuditEntry {
  id: string
  action: string
  actor_email?: string
  created_at: string
  detail?: string
}

export default function AuditWidget(_props: { node: SchemaNode }) {
  const { token } = useRuntime()
  const [items, setItems] = useState<AuditEntry[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiFetch<{ items: AuditEntry[]; total: number }>('/api/v1/audit/logs?limit=8', token)
      .then((d) => setItems(d.items || []))
      .catch(() => setMsg('暂无审计日志权限或接口不可用'))
  }, [token])

  return (
    <div className="widget audit-widget">
      <h3>操作审计日志</h3>
      <p className="muted">最近操作记录（管理员可见）</p>
      {msg && <p className="muted">{msg}</p>}
      {items.length === 0 && !msg && <p className="muted">暂无记录</p>}
      <ul className="integration-samples">
        {items.map((row) => (
          <li key={row.id} className="list-card">
            <div>
              <div className="list-card-head">
                <strong>{row.action}</strong>
                <span className="tag">{row.created_at?.slice(0, 16) || ''}</span>
              </div>
              <p className="muted">{row.actor_email || '系统'} · {row.detail || '—'}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
