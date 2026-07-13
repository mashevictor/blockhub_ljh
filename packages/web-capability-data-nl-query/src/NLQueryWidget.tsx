import { useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface NLQueryResult {
  question: string
  answer?: string
  chart_type?: string
}

const SUGGESTIONS = [
  '上个月审批通过率是多少？',
  '哪个功能使用最多？',
  '本周新增了多少文档？',
]

export default function NLQueryWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor } = useRuntime()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NLQueryResult | null>(null)
  const [error, setError] = useState('')

  const runQuery = async (q: string) => {
    const text = q.trim()
    if (!text || loading) return
    setQuestion(text)
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<NLQueryResult>('/api/v1/reports/nl-query', token, {
        method: 'POST',
        body: JSON.stringify({ question: text }),
      })
      setResult(data)
    } catch (e) {
      setError(String(e))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="widget nl-query-widget">
      <h3>智能问数</h3>
      <p className="muted">用自然语言查询业务数据，系统自动解析并返回结果。</p>
      <div className="nl-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="btn-ghost nl-suggest-btn"
            onClick={() => void runQuery(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void runQuery(question)}
          placeholder="例如：本月问答次数趋势如何？"
          disabled={loading}
        />
        <button
          type="button"
          className="btn"
          style={{ background: primaryColor }}
          disabled={loading || !question.trim()}
          onClick={() => void runQuery(question)}
        >
          {loading ? '查询中…' : '查询'}
        </button>
      </div>
      {error && <p className="error-msg">{error}</p>}
      {result?.answer && (
        <div className="nl-result">
          <strong>查询结果</strong>
          <p>{result.answer.replace(/\*\*/g, '')}</p>
          {result.chart_type && (
            <span className="tag">图表类型：{result.chart_type}</span>
          )}
        </div>
      )}
    </div>
  )
}
