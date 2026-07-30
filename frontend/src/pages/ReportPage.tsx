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
      <div className="page-header page-header--split">
        <div>
          <h1>{t('admin.page.reports.title')}</h1>
          <p>{t('admin.page.reports.desc')}</p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={handleExport}>{t('admin.page.reports.export')}</button>
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
        <h3 style={{ marginBottom: 12 }}>{t('admin.page.reports.nl_title')}</h3>
        <div className="nl-query-row">
          <input
            className="search-input"
            style={{ flex: 1 }}
            placeholder={t('admin.page.reports.nl_ph')}
            value={nlQuestion}
            onChange={(e) => setNlQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNlQuery()}
          />
          <button type="button" className="btn btn-primary-dark" onClick={() => handleNlQuery()}>
            {t('admin.page.reports.nl_query')}
          </button>
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
            <div>
              <h3>{t('admin.page.reports.approval_trend')}</h3>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('admin.page.reports.approval_trend_sub')}</span>
            </div>
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
            <div>
              <h3>{t('admin.page.reports.chat_trend')}</h3>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('admin.page.reports.chat_trend_sub')}</span>
            </div>
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
        <h3 style={{ marginBottom: 14 }}>{t('admin.page.reports.usage_title')}</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{t('admin.page.reports.usage_sub')}</p>
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
          <div><strong>{data.total_calls.toLocaleString()}</strong><span>{t('admin.page.reports.total_calls')}</span></div>
          <div><strong>{data.availability}</strong><span>{t('admin.page.reports.availability')}</span></div>
          <div><strong>{data.avg_response_ms}ms</strong><span>{t('admin.page.reports.avg_response')}</span></div>
        </div>
      </div>
    </>
  )
}
