import { useEffect, useRef, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  fetchChatConfig,
  fetchChatMessages,
  fetchKbBases,
  sendChatMessageStream,
  type ChatCitation,
  type ChatMessage,
} from '../api/client'

export default function ChatPage() {
  const t = useT()
  const [config, setConfig] = useState<{
    title: string
    description: string
    default_model: string
    models: string[]
    suggestions: string[]
    llm_configured?: boolean
    embedding_configured?: boolean
    rag_available?: boolean
  } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamSource, setStreamSource] = useState<string | null>(null)
  const [useRag, setUseRag] = useState(true)
  const [kbId, setKbId] = useState('')
  const [kbOptions, setKbOptions] = useState<Array<{ id: string; name: string }>>([])
  const [liveCitations, setLiveCitations] = useState<ChatCitation[] | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const assistantIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetchChatConfig().then((c) => {
      setConfig(c)
      setModel(c.default_model)
      setUseRag(Boolean(c.rag_available))
    })
    fetchChatMessages().then(setMessages)
    fetchKbBases().then((items) => {
      setKbOptions(items.map((k: { id: string; name: string }) => ({ id: k.id, name: k.name })))
      if (items[0]) setKbId(items[0].id)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveCitations])

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)
    setStreamSource(null)
    setLiveCitations(null)
    const userMsg: ChatMessage = {
      id: `tmp-u-${Date.now()}`,
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    }
    const assistantId = `tmp-a-${Date.now()}`
    assistantIdRef.current = assistantId
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString() },
    ])
    try {
      await sendChatMessageStream(
        msg,
        'default',
        model,
        (content, done, source, citations) => {
          if (source) setStreamSource(source)
          if (citations?.length) setLiveCitations(citations)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content, citations: done ? citations : m.citations, source }
                : m,
            ),
          )
          if (done) {
            fetchChatMessages().then(setMessages)
            setLiveCitations(null)
          }
        },
        { useRag, kbId: kbId || undefined, topK: 4 },
      )
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
    } finally {
      setLoading(false)
      assistantIdRef.current = null
    }
  }

  const sourceLabel = (s?: string) => {
    if (s === 'llm') return t('admin.chat.source.llm')
    if (s === 'kb') return t('admin.chat.source.kb')
    if (s === 'mock') return t('admin.chat.source.mock')
    return s ?? ''
  }

  const modelLabel = (m: string) => (m === 'doubao-seed-2-0-mini' ? t('admin.chat.model.standard') : m)

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <button type="button" className="btn btn-primary-dark" style={{ width: '100%', marginBottom: 12 }}>
          {t('admin.chat.new_conversation')}
        </button>
        <div className="chat-sidebar-item active">{t('admin.chat.default_session')}</div>
        <label className="chat-rag-toggle">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
            disabled={!config?.rag_available}
          />
          <span>{t('admin.chat.rag_toggle')}</span>
        </label>
        {useRag && kbOptions.length > 0 && (
          <select
            className="model-select"
            style={{ width: '100%', marginTop: 8 }}
            value={kbId}
            onChange={(e) => setKbId(e.target.value)}
            aria-label={t('admin.chat.kb_scope_aria')}
          >
            {kbOptions.map((kb) => (
              <option key={kb.id} value={kb.id}>{kb.name}</option>
            ))}
          </select>
        )}
        {config && (
          <p className="chat-sidebar-meta">
            {config.llm_configured ? t('admin.chat.llm_connected') : t('admin.chat.demo_mode')}
            {config.embedding_configured ? t('admin.chat.vector_search') : t('admin.chat.keyword_search')}
            {streamSource && ` · ${sourceLabel(streamSource)}`}
          </p>
        )}
      </aside>

      <div className="chat-main">
        <div className="chat-header">
          <div>
            <h2>{config?.title ?? t('admin.page.chat.title')}</h2>
            <p>{config?.description ?? t('admin.chat.default_desc')}</p>
          </div>
          <select className="model-select" value={model} onChange={(e) => setModel(e.target.value)} aria-label={t('admin.chat.model_aria')}>
            {(config?.models ?? [t('admin.chat.model.standard')]).map((m) => (
              <option key={m} value={m}>{modelLabel(m)}</option>
            ))}
          </select>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <h3>{t('admin.chat.welcome.title')}</h3>
              <p>{t('admin.chat.welcome.lead')}</p>
              <div className="chat-suggestions">
                {(config?.suggestions ?? []).map((s) => (
                  <button key={s} type="button" className="suggestion-chip" onClick={() => void handleSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.role}`}>
              <div className="bubble-content">
                {m.content || (loading && m.id === assistantIdRef.current ? '▍' : '')}
              </div>
              {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                <div className="chat-citations">
                  <strong>{t('admin.chat.citations.title')}</strong>
                  <ul>
                    {m.citations.map((c) => (
                      <li key={`${c.document_id}-${c.chunk_index}`}>
                        <span className="cite-index">[{c.index}]</span>
                        <span className="cite-doc">{c.doc_name}</span>
                        <p>{c.snippet}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {liveCitations && liveCitations.length > 0 && loading && (
            <div className="chat-citations chat-citations-live">
              <strong>{t('admin.chat.citations.live', { n: liveCitations.length })}</strong>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-bar">
          <input
            className="chat-input"
            placeholder={t('admin.chat.input_ph')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
            disabled={loading}
          />
          <button type="button" className="btn btn-primary-dark" onClick={() => void handleSend()} disabled={loading}>
            {loading ? t('admin.chat.generating') : t('admin.chat.send')}
          </button>
        </div>
        <p className="chat-disclaimer">{t('admin.chat.disclaimer')}</p>
      </div>
    </div>
  )
}
