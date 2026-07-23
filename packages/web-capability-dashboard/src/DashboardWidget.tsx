import { useEffect, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface DashboardData {
  pending_approvals?: number
  chat_sessions?: number
  knowledge_bases?: number
  documents?: number
}

interface FinanceCard {
  key: string
  label: string
  open: number
  total: number
}

interface FinanceStats {
  open?: number
  total?: number
  cards?: FinanceCard[]
  kyc_open?: number
  aml_open?: number
  credit_open?: number
}

export default function DashboardWidget(props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const metricsSource = String(props.node?.props?.metrics_source || '').trim()
  const [stats, setStats] = useState<DashboardData>({})
  const [finance, setFinance] = useState<FinanceStats | null>(null)

  useEffect(() => {
    if (!token) return
    if (metricsSource === 'finance_ops') {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      apiFetch<FinanceStats>(`/api/v1/finance-ops/stats${q}`, token)
        .then(setFinance)
        .catch(() => setFinance({ open: 0, total: 0, cards: [] }))
      return
    }
    Promise.all([
      apiFetch<{ pending_approvals?: number; chat_sessions?: number }>('/api/v1/stats/dashboard', token).catch(() => ({})),
      apiFetch<{ knowledge_bases: number; documents: number }>('/api/v1/kb/stats', token).catch(() => ({})),
    ]).then(([overview, kb]) => setStats({ ...overview, ...kb }))
  }, [token, metricsSource, appId])

  if (metricsSource === 'finance_ops') {
    const cards =
      finance?.cards?.length
        ? finance.cards.map((c) => ({ label: `${c.label}待办`, value: c.open }))
        : [
            { label: 'KYC待办', value: finance?.kyc_open ?? 0 },
            { label: 'AML待办', value: finance?.aml_open ?? 0 },
            { label: '授信待办', value: finance?.credit_open ?? 0 },
            { label: '全部待办', value: finance?.open ?? 0 },
          ]
    return (
      <div className="widget dashboard-widget">
        <h3>风险经营看板</h3>
        <div className="stat-grid">
          {cards.map((c) => (
            <div key={c.label} className="stat-card" style={{ borderColor: primaryColor }}>
              <div className="stat-n" style={{ color: primaryColor }}>{c.value}</div>
              <div className="stat-l">{c.label}</div>
            </div>
          ))}
        </div>
        {!finance?.total ? <p className="muted" style={{ marginTop: 12 }}>空库无业务计数</p> : null}
      </div>
    )
  }

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
