import { useEffect, useRef, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface AgentItem {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

interface ChatMessage {
  id: string
  role: string
  content: string
}

export default function MultiAgentWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [agents, setAgents] = useState<AgentItem[]>([])
  const [agentId, setAgentId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionId = `multi-${appId}-${agentId || 'default'}`

  useEffect(() => {
    apiFetch<{ items: AgentItem[] }>('/api/v1/agents', token)
      .then((d) => {
        const items = d.items ?? []
        setAgents(items)
        if (items.length && !agentId) setAgentId(items[0].id)
      })
      .catch(() => setAgents([]))
  }, [token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selected = agents.find((a) => a.id === agentId)

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading || !agentId) return
    setInput('')
    setLoading(true)
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    try {
      const res = await apiFetch<{ message?: { content?: string } }>(
        '/api/v1/chat/completions',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            message: `[${selected?.name ?? agentId}] ${text}`,
            session_id: sessionId,
            model: 'doubao-seed-2-0-mini',
            use_rag: true,
          }),
        },
      )
      const reply = res.message?.content ?? '（无回复）'
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }])
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
    <div className="widget multi-agent-widget">
      <h3>多助手切换</h3>
      <p className="muted">选择不同 Agent 助手，在同一界面切换问答上下文。</p>
      <div className="agent-picker">
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`agent-chip${agentId === a.id ? ' active' : ''}`}
            style={agentId === a.id ? { borderColor: primaryColor, color: primaryColor } : undefined}
            onClick={() => {
              setAgentId(a.id)
              setMessages([])
            }}
          >
            {a.icon ? `${a.icon} ` : ''}{a.name}
          </button>
        ))}
      </div>
      {selected && <p className="muted agent-desc">{selected.description ?? ''}</p>}
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="muted">向 {selected?.name ?? '助手'} 提问…</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-${m.role}`}>
            <strong>{m.role === 'user' ? '我' : selected?.name ?? '助手'}</strong>
            <p>{m.content}</p>
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
          disabled={loading || !agentId}
        />
        <button
          type="button"
          className="btn"
          style={{ background: primaryColor }}
          disabled={loading || !input.trim() || !agentId}
          onClick={() => void handleSend()}
        >
          {loading ? '…' : '发送'}
        </button>
      </div>
    </div>
  )
}
