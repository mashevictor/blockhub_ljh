import { useEffect, useRef, useState } from 'react'
import {
  fetchChatConfig,
  fetchChatMessages,
  sendChatMessage,
  type ChatMessage,
} from '../api/client'

export default function ChatPage() {
  const [config, setConfig] = useState<{ title: string; description: string; default_model: string; models: string[]; suggestions: string[] } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChatConfig().then((c) => {
      setConfig(c)
      setModel(c.default_model)
    })
    fetchChatMessages().then(setMessages)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: 'user', content: msg, created_at: new Date().toISOString() }])
    try {
      const res = await sendChatMessage(msg, 'default', model)
      setMessages((prev) => [...prev.filter((m) => !m.id.startsWith('tmp-')), ...prev.filter((m) => m.id.startsWith('tmp-')), res.message])
      fetchChatMessages().then(setMessages)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <button type="button" className="btn btn-primary-dark" style={{ width: '100%', marginBottom: 12 }}>
          + 新对话
        </button>
        <div className="chat-sidebar-item active">默认会话</div>
      </aside>

      <div className="chat-main">
        <div className="chat-header">
          <div>
            <h2>{config?.title ?? '智能问答'}</h2>
            <p>{config?.description ?? '基于企业知识库的多轮对话'}</p>
          </div>
          <select className="model-select" value={model} onChange={(e) => setModel(e.target.value)} aria-label="对话模型">
            {(config?.models ?? ['标准模式']).map((m) => (
              <option key={m} value={m}>{m === 'doubao-seed-2-0-mini' ? '标准模式' : m}</option>
            ))}
          </select>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <h3>有什么可以帮您？</h3>
              <p>可询问公司制度、操作指引等，系统将结合知识库为您解答</p>
              <div className="chat-suggestions">
                {(config?.suggestions ?? []).map((s) => (
                  <button key={s} type="button" className="suggestion-chip" onClick={() => handleSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.role}`}>
              <div className="bubble-content">{m.content}</div>
            </div>
          ))}
          {loading && <div className="chat-bubble assistant"><div className="bubble-content typing">思考中…</div></div>}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-bar">
          <input
            className="chat-input"
            placeholder="输入您的问题…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button type="button" className="btn btn-primary-dark" onClick={() => handleSend()} disabled={loading}>
            发送
          </button>
        </div>
        <p className="chat-disclaimer">回答由 AI 生成，重要事项请以正式制度文件为准</p>
      </div>
    </div>
  )
}
