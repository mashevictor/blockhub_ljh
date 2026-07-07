import { useEffect, useRef, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface ChatMessage {
  id: string
  role: string
  content: string
  citations?: Array<{ doc_name: string; snippet: string }>
  source?: string
}

export default function ChatWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model] = useState('doubao-seed-2-0-mini')
  const sessionId = `runtime-${appId}`
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch<{ items: ChatMessage[] }>(`/api/v1/chat/sessions/${sessionId}/messages`, token)
      .then((d) => setMessages(d.items))
      .catch(() => setMessages([]))
  }, [token, sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    try {
      const res = await apiFetch<{ message: ChatMessage }>('/api/v1/chat/completions', token, {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          model,
          use_rag: true,
        }),
      })
      setMessages((prev) => [...prev, res.message])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: `发送失败：${String(e)}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="widget chat-widget">
      <div className="chat-messages">
        {messages.length === 0 && <p className="muted">向智能助手提问，支持结合企业知识库回答。</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-${m.role}`}>
            <strong>{m.role === 'user' ? '我' : '助手'}</strong>
            <p>{m.content}</p>
            {m.citations && m.citations.length > 0 && (
              <div className="chat-citations">
                {m.citations.map((c, i) => (
                  <div key={i} className="citation">
                    《{c.doc_name}》：{c.snippet}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
          placeholder="输入问题…"
          disabled={loading}
        />
        <button
          type="button"
          className="btn"
          style={{ background: primaryColor }}
          disabled={loading || !input.trim()}
          onClick={() => void handleSend()}
        >
          {loading ? '…' : '发送'}
        </button>
      </div>
    </div>
  )
}
