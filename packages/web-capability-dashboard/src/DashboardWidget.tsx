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
    if (metricsSource === 'logistics_ops') {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      apiFetch<FinanceStats>(`/api/v1/logistics-ops/stats${q}`, token)
        .then(setFinance)
        .catch(() => setFinance({ open: 0, total: 0, cards: [] }))
      return
    }
    if (metricsSource === 'realestate_ops') {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      apiFetch<FinanceStats>(`/api/v1/realestate-ops/stats${q}`, token)
        .then(setFinance)
        .catch(() => setFinance({ open: 0, total: 0, cards: [] }))
      return
    }
    Promise.all([
      apiFetch<{ pending_approvals?: number; chat_sessions?: number }>('/api/v1/stats/dashboard', token).catch(() => ({})),
      apiFetch<{ knowledge_bases: number; documents: number }>('/api/v1/kb/stats', token).catch(() => ({})),
    ]).then(([overview, kb]) => setStats({ ...overview, ...kb }))
  }, [token, metricsSource, appId])

  if (metricsSource === 'finance_ops' || metricsSource === 'logistics_ops' || metricsSource === 'realestate_ops') {
    const title =
      metricsSource === 'logistics_ops'
        ? '在途可视看板'
        : metricsSource === 'realestate_ops'
          ? '楼盘经营看板'
          : '风险经营看板'
    const cards =
      finance?.cards?.length
        ? finance.cards.map((c) => ({ label: `${c.label}待办`, value: c.open }))
        : metricsSource === 'logistics_ops'
          ? [
              { label: '运单待办', value: (finance as { waybill_open?: number } | null)?.waybill_open ?? 0 },
              { label: '异常待办', value: (finance as { exception_open?: number } | null)?.exception_open ?? 0 },
              { label: '冷链待办', value: (finance as { cold_open?: number } | null)?.cold_open ?? 0 },
              { label: '全部待办', value: finance?.open ?? 0 },
            ]
          : metricsSource === 'realestate_ops'
            ? [
                { label: '房源待办', value: (finance as { listing_open?: number } | null)?.listing_open ?? 0 },
                { label: '租金待办', value: (finance as { rent_open?: number } | null)?.rent_open ?? 0 },
                { label: '投诉待办', value: (finance as { complaint_open?: number } | null)?.complaint_open ?? 0 },
                { label: '全部待办', value: finance?.open ?? 0 },
              ]
          : [
              { label: 'KYC待办', value: finance?.kyc_open ?? 0 },
              { label: 'AML待办', value: finance?.aml_open ?? 0 },
              { label: '授信待办', value: finance?.credit_open ?? 0 },
              { label: '全部待办', value: finance?.open ?? 0 },
            ]
    return (
      <div className="widget dashboard-widget">
        <h3>{title}</h3>
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
