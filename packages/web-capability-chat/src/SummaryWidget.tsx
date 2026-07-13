import { useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

export default function SummaryWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [sessionId, setSessionId] = useState(`runtime-${appId}`)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const msgs = await apiFetch<{ items: Array<{ role: string; content: string }> }>(
        `/api/v1/chat/sessions/${sessionId}/messages`,
        token,
      )
      const text = (msgs.items ?? [])
        .slice(-12)
        .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
        .join('\n')
      if (!text.trim()) {
        setSummary('当前会话暂无消息，请先进行几轮问答后再生成摘要。')
        return
      }
      const res = await apiFetch<{ message?: { content?: string } }>(
        '/api/v1/chat/completions',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            message: `请用 3-5 条要点总结以下对话：\n\n${text}`,
            session_id: `${sessionId}-summary`,
            model: 'doubao-seed-2-0-mini',
            use_rag: false,
          }),
        },
      )
      setSummary(res.message?.content ?? '（无法生成摘要）')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="widget summary-widget">
      <h3>对话摘要</h3>
      <p className="muted">基于当前会话历史自动生成要点摘要。</p>
      <label>
        会话 ID
        <input
          className="input"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="runtime-xxx"
        />
      </label>
      <button
        type="button"
        className="btn"
        style={{ background: primaryColor }}
        disabled={loading}
        onClick={() => void generate()}
      >
        {loading ? '生成中…' : '生成摘要'}
      </button>
      {error && <p className="error-msg">{error}</p>}
      {summary && (
        <div className="nl-result" style={{ marginTop: 12 }}>
          <strong>摘要</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{summary}</p>
        </div>
      )}
    </div>
  )
}
