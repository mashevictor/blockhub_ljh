import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { exportReport, fetchReportDashboard, nlQuery } from '../api/client'

export default function ReportPage() {
  const t = useT()
  const [data, setData] = useState<{
    kpis: Array<{ label: string; value: string; change: string; positive: boolean }>
    approval_trend: { growth: string; months: string[]; values: number[] }
    chat_trend: { growth: string; months: string[]; values: number[] }
    agent_usage: Array<{ agent: string; calls: number; percent: number }>
    total_calls: number
    availability: string
    avg_response_ms: number
    nl_suggestions: string[]
  } | null>(null)
  const [nlQuestion, setNlQuestion] = useState('')
  const [nlAnswer, setNlAnswer] = useState('')

  useEffect(() => {
    fetchReportDashboard().then(setData)
  }, [])

  const handleNlQuery = async (q?: string) => {
    const question = q ?? nlQuestion
    if (!question.trim()) return
    const res = await nlQuery(question)
    setNlAnswer(res.answer)
  }

  const handleExport = async () => {
    const res = await exportReport()
    alert(res.message)
  }

  if (!data) return <div className="placeholder-page"><div className="icon">⏳</div><h2>{t('common.loading')}</h2></div>

  const maxApproval = Math.max(...data.approval_trend.values)
  const maxChat = Math.max(...data.chat_trend.values)

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1>数据报表</h1>
          <p>查看使用情况、审批与问答趋势，支持常用报表查询</p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={handleExport}>导出报表</button>
      </div>

      <div className="kpi-grid">
        {data.kpis.map((k) => (
          <div key={k.label} className="kpi-card">
            <div className={`kpi-change${k.positive ? ' up' : ' down'}`}>{k.change}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>一句话查数据</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="search-input" style={{ flex: 1 }} placeholder="输入查询问题…" value={nlQuestion} onChange={(e) => setNlQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNlQuery()} />
          <button type="button" className="btn btn-primary-dark" onClick={() => handleNlQuery()}>查询</button>
        </div>
        <div className="nl-suggestions">
          {data.nl_suggestions.map((s) => (
            <button key={s} type="button" className="suggestion-chip" onClick={() => { setNlQuestion(s); handleNlQuery(s) }}>{s}</button>
          ))}
        </div>
        {nlAnswer && <div className="nl-answer">{nlAnswer}</div>}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="trend-header">
            <div><h3>审批趋势</h3><span style={{ fontSize: 12, color: 'var(--muted)' }}>近 6 个月审批数量</span></div>
            <span className="trend-growth">{data.approval_trend.growth}</span>
          </div>
          <div className="month-chart">
            {data.approval_trend.months.map((m, i) => (
              <div key={m} className="month-bar-group">
                <div className="month-bar" style={{ height: `${(data.approval_trend.values[i] / maxApproval) * 100}px` }} />
                <span>{m}</span>
                <span className="month-val">{data.approval_trend.values[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="trend-header">
            <div><h3>问答趋势</h3><span style={{ fontSize: 12, color: 'var(--muted)' }}>近 6 个月问答次数</span></div>
            <span className="trend-growth">{data.chat_trend.growth}</span>
          </div>
          <div className="month-chart">
            {data.chat_trend.months.map((m, i) => (
              <div key={m} className="month-bar-group">
                <div className="month-bar chat" style={{ height: `${(data.chat_trend.values[i] / maxChat) * 100}px` }} />
                <span>{m}</span>
                <span className="month-val">{data.chat_trend.values[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 14 }}>各功能使用占比</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>本月各能力使用次数</p>
        {data.agent_usage.map((a) => (
          <div key={a.agent} className="usage-row">
            <span className="usage-label">{a.agent}</span>
            <div className="usage-bar-wrap">
              <div className="usage-bar" style={{ width: `${a.percent}%` }} />
            </div>
            <span className="usage-val">{a.calls.toLocaleString()}({a.percent}%)</span>
          </div>
        ))}
        <div className="report-footer-stats">
          <div><strong>{data.total_calls.toLocaleString()}</strong><span>本月总使用</span></div>
          <div><strong>{data.availability}</strong><span>系统可用率</span></div>
          <div><strong>{data.avg_response_ms}ms</strong><span>平均响应</span></div>
        </div>
      </div>
    </>
  )
}
