import { useCallback, useMemo, useRef, useState } from 'react'
import { useRuntime, type SchemaNode } from '@blockhub/web-core'

type VoiceState = 'disconnected' | 'connecting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

interface VoiceMessage {
  role: 'user' | 'assistant'
  text: string
}

function resolveWsUrl(configUrl: string): string {
  if (configUrl.startsWith('ws://') || configUrl.startsWith('wss://')) return configUrl
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${configUrl}`
}

export default function ShanghaiVoiceWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const sessionId = useMemo(() => `runtime-voice-${crypto.randomUUID()}`, [])
  const [state, setState] = useState<VoiceState>('disconnected')
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [partial, setPartial] = useState('')
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setState('disconnected')
  }, [])

  const connect = useCallback(async () => {
    if (wsRef.current) return
    setError('')
    setState('connecting')
    try {
      const cfgRes = await fetch('/api/v1/voice/config')
      const cfg = (await cfgRes.json()) as { configured: boolean; ws_url: string }
      if (!cfg.configured) throw new Error('电信语音服务未配置')
      const url = `${resolveWsUrl(cfg.ws_url)}?session_id=${encodeURIComponent(sessionId)}`
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onopen = () => setState('idle')
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as Record<string, unknown>
        const type = String(msg.type || '')
        if (type === 'state') {
          setState(String(msg.state || 'idle') as VoiceState)
        } else if (type === 'partial') {
          setPartial(String(msg.text || ''))
        } else if (type === 'final') {
          const text = String(msg.text || '')
          setPartial('')
          if (text) setMessages((p) => [...p, { role: 'user', text }])
        } else if (type === 'reply') {
          const text = String(msg.text || '')
          if (text) setMessages((p) => [...p, { role: 'assistant', text }])
        } else if (type === 'error') {
          setError(String(msg.message || '语音出错'))
          setState('error')
        }
      }
      ws.onerror = () => {
        setError('WebSocket 连接失败')
        setState('error')
      }
      ws.onclose = () => {
        wsRef.current = null
        setState('disconnected')
      }
    } catch (e) {
      setError(String(e))
      setState('error')
    }
  }, [sessionId])

  const sendText = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'text', text }))
    setMessages((p) => [...p, { role: 'user', text }])
  }

  const [textInput, setTextInput] = useState('')

  return (
    <div className="widget voice-widget">
      <h3>上海话语音</h3>
      <p className="muted">状态：{state}</p>
      <div className="voice-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-${m.role}`}>
            <strong>{m.role === 'user' ? '你' : '助手'}</strong>
            <p>{m.text}</p>
          </div>
        ))}
        {partial && <p className="muted">识别中：{partial}</p>}
      </div>
      {error && <p className="error-msg">{error}</p>}
      <div className="row-actions">
        {state === 'disconnected' ? (
          <button type="button" className="btn" style={{ background: primaryColor }} onClick={() => void connect()}>连接语音</button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={disconnect}>断开</button>
        )}
      </div>
      <div className="chat-input-row">
        <input className="input" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="或输入文字（免麦模式）" />
        <button
          type="button"
          className="btn"
          style={{ background: primaryColor }}
          onClick={() => {
            if (textInput.trim()) {
              sendText(textInput.trim())
              setTextInput('')
            }
          }}
        >
          发送
        </button>
      </div>
    </div>
  )
}
