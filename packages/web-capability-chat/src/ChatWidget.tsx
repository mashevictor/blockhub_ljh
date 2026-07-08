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

  const streamReply = async (text: string) => {
    const res = await fetch('/api/v1/chat/completions/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: text,
        session_id: sessionId,
        model,
        use_rag: true,
      }),
    })
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`)
    }

    const assistantId = `a-${Date.now()}`
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let finalMessage: ChatMessage | null = null

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const chunks = buf.split('\n\n')
      buf = chunks.pop() ?? ''
      for (const chunk of chunks) {
        const line = chunk
          .split('\n')
          .find((item) => item.startsWith('data: '))
        if (!line) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') continue
        const evt = JSON.parse(payload) as {
          content?: string
          done?: boolean
          message?: ChatMessage
        }
        if (evt.message) {
          finalMessage = evt.message
        }
        if (typeof evt.content === 'string') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: evt.content ?? '' } : m)),
          )
        }
      }
    }

    if (finalMessage) {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? finalMessage as ChatMessage : m)))
    } else {
      const latest = await apiFetch<{ items: ChatMessage[] }>(`/api/v1/chat/sessions/${sessionId}/messages`, token)
      setMessages(latest.items)
    }
  }

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
      await streamReply(text)
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
