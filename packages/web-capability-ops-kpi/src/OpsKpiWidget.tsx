import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  period: string
  value: string
  note: string
  status: string
}

interface NLQueryResult {
  question: string
  answer?: string
}

const SUGGESTIONS = ['本月审批通过率？', '本周新增报销多少？', '哪个模块用得最多？']

export function OpsKpiWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [nlBusy, setNlBusy] = useState(false)
  const [question, setQuestion] = useState('')
  const [nlResult, setNlResult] = useState<NLQueryResult | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const accent = primaryColor || '#0f766e'

  const cards = useMemo(() => {
    const published = items.filter((t) => t.status === 'published' || t.status === 'open')
    return published.slice(0, 4)
  }, [items])

  const manualSteps: GtgtStep[] = useMemo(
    () => [
      { key: 'title', label: '指标名', placeholder: '如：月营收' },
      { key: 'value', label: '数值', placeholder: '128.5万' },
      { key: 'period', label: '周期（可空）', placeholder: '2026-07', optional: true },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/ops-kpi/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const runNl = async (q: string) => {
    const text = q.trim()
    if (!token || !text) return
    setNlBusy(true)
    setMsg('')
    setQuestion(text)
    try {
      const data = await apiFetch<NLQueryResult>('/api/v1/reports/nl-query', token, {
        method: 'POST',
        body: JSON.stringify({ question: text }),
      })
      setNlResult(data)
    } catch (e) {
      setMsg(`查数失败：${String(e)}`)
      setNlResult(null)
    } finally {
      setNlBusy(false)
    }
  }

  const saveAsKpi = async () => {
    if (!token || !nlResult?.answer) return
    setBusy(true)
    try {
      await apiFetch('/api/v1/ops-kpi/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'query',
          title: (nlResult.question || question).slice(0, 80),
          period: '即时',
          value: (nlResult.answer || '').slice(0, 120),
          note: '由自然语言查数存入',
          app_public_id: appId || '',
        }),
      })
      setMsg('已存为指标')
      await load()
    } catch (e) {
      setMsg(`保存失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const submitManual = async () => {
    if (!token || !values.title?.trim() || !values.value?.trim()) return
    setBusy(true)
    try {
      await apiFetch('/api/v1/ops-kpi/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'kpi',
          title: values.title.trim(),
          period: (values.period || '').trim(),
          value: values.value.trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setShowManual(false)
      setMsg('已补录指标')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>经营指标</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && cards.length === 0 && (
        <p className="muted">暂无指标，用下面自然语言查数，或补录一条</p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {cards.map((c) => (
          <div key={c.id} className="list-card" style={{ padding: 12 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {c.period || '周期未填'}
            </div>
            <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13 }}>{c.title}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: accent }}>{c.value || '—'}</div>
          </div>
        ))}
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>一句查数</h4>
      <div className="row-actions" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void runNl(s)}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <input
          className="input"
          style={{ flex: '1 1 200px' }}
          placeholder="例如：本月报销合计多少？"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runNl(question)
          }}
        />
        <button
          type="button"
          className="btn"
          style={{ background: accent }}
          disabled={nlBusy || !question.trim()}
          onClick={() => void runNl(question)}
        >
          {nlBusy ? '查询中…' : '查询'}
        </button>
      </div>
      {nlResult?.answer && (
        <div className="list-card" style={{ marginBottom: 12 }}>
          <div className="list-card-head">
            <strong>{nlResult.question}</strong>
            <span className="tag">查数结果</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5 }}>{nlResult.answer}</p>
          <button
            type="button"
            className="btn"
            style={{ background: accent, marginTop: 10 }}
            disabled={busy}
            onClick={() => void saveAsKpi()}
          >
            存为指标
          </button>
        </div>
      )}

      {!showManual ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowManual(true)}>
          + 手工补录指标
        </button>
      ) : (
        <GtgtStepComposer
          title="补录指标"
          meta="次要入口"
          accent={accent}
          flowHint="指标名 → 数值 → 周期"
          steps={manualSteps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submitManual}
          busy={busy}
          resetKey={resetKey}
          submitLabel="保存指标"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
