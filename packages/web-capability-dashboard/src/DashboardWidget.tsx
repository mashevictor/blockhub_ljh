import { useEffect, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface DashboardData {
  pending_approvals?: number
  chat_sessions?: number
  knowledge_bases?: number
  documents?: number
}

export default function DashboardWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor } = useRuntime()
  const [stats, setStats] = useState<DashboardData>({})

  useEffect(() => {
    Promise.all([
      apiFetch<{ pending_approvals?: number; chat_sessions?: number }>('/api/v1/stats/dashboard', token).catch(() => ({})),
      apiFetch<{ knowledge_bases: number; documents: number }>('/api/v1/kb/stats', token).catch(() => ({})),
    ]).then(([overview, kb]) => setStats({ ...overview, ...kb }))
  }, [token])

  const cards = [
    { label: '待审批', value: stats.pending_approvals ?? '—' },
    { label: '对话会话', value: stats.chat_sessions ?? '—' },
    { label: '知识库', value: stats.knowledge_bases ?? '—' },
    { label: '文档数', value: stats.documents ?? '—' },
  ]

  return (
    <div className="widget dashboard-widget">
      <h3>数据看板</h3>
      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card" style={{ borderColor: primaryColor }}>
            <div className="stat-n" style={{ color: primaryColor }}>{c.value}</div>
            <div className="stat-l">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
