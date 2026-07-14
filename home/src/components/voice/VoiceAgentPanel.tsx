import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useVoiceWebSocket } from '../../hooks/useVoiceWebSocket'
import { api } from '../../api/client'

function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `web-${crypto.randomUUID()}`
    }
  } catch {
    /* ignore */
  }
  return `web-${Date.now().toString(36)}`
}

const STATE_LABEL: Record<string, string> = {
  disconnected: '未连接',
  connecting: '连接中…',
  idle: '待命',
  listening: '正在听',
  thinking: '思考中',
  speaking: '播报中',
  error: '出错',
}

export default function VoiceAgentPanel() {
  const sessionId = useMemo(() => newSessionId(), [])
  const {
    state,
    partialText,
    messages,
    error,
    micActive,
    micError,
    connect,
    disconnect,
    startMic,
    stopMic,
    bargeIn,
    simulateUtterance,
    sendText,
  } = useVoiceWebSocket(sessionId)

  const [started, setStarted] = useState(false)
  const [voiceConfigured, setVoiceConfigured] = useState<boolean | null>(null)
  const [demoSamples, setDemoSamples] = useState<Array<{ label: string; utterance: string }>>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.get<{ configured: boolean; demo_samples?: Array<{ label: string; utterance: string }> }>('/voice/config')
      .then((res) => {
        setVoiceConfigured(res.data.configured)
        setDemoSamples(res.data.demo_samples ?? [])
      })
      .catch(() => setVoiceConfigured(false))
  }, [])

  const ensureConnected = async () => {
    if (!started) setStarted(true)
    await connect()
  }

  const handleConnect = async () => {
    await ensureConnected()
  }

  const handleSendText = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await ensureConnected()
      await sendText(text, 'text')
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  const handleDemo = async (utterance: string) => {
    await ensureConnected()
    await simulateUtterance(utterance)
  }

  const handleMicToggle = async () => {
    if (micActive) {
      stopMic()
      return
    }
    await ensureConnected()
    await startMic()
  }

  const handleDisconnect = () => {
    setStarted(false)
    disconnect()
  }

  const busy = state === 'thinking' || state === 'speaking' || sending

  return (
    <div className="voice-agent-panel">
      <div className="voice-agent-header">
        <div>
          <h2>上海话语音助手</h2>
          <p>文字对话走真实 DeepSeek · 回复经电信上海话 TTS 播报 · 开麦可选</p>
        </div>
        <span className={`voice-state-badge voice-state-${state}`}>{STATE_LABEL[state] || state}</span>
      </div>

      {voiceConfigured === false && (
        <div className="voice-setup-banner" role="alert">
          <strong>语音服务未配置</strong>
          <p>服务器未设置电信星辰 API Key，无法连接实时语音。请联系管理员配置 <code>TELEAI_*</code>。</p>
        </div>
      )}

      {voiceConfigured === null && (
        <p className="voice-empty">正在检查语音服务…</p>
      )}

      <div className="voice-agent-messages">
        {messages.length === 0 && !partialText && (
          <div className="voice-welcome">
            <p className="voice-welcome-title">真实业务链路（非演示 Mock）</p>
            <p className="voice-empty">
              网页端可直接输入文字或点例句：跳过麦克风，仍走 LLM + 上海话 TTS。开麦在浏览器允许时可用，失败不影响文字业务。
            </p>
            <ol className="voice-welcome-steps">
              <li>点「连接助手」或直接发送文字</li>
              <li>听到上海话播报后可点「打断」</li>
              <li>可选：允许麦克风后「按住说话」（失败可忽略）</li>
            </ol>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={`${m.role}-${idx}`} className={`voice-msg voice-msg-${m.role}`}>
            <strong>{m.role === 'user' ? '侬讲' : '助手（上海话）'}</strong>
            <span>{m.text}</span>
          </div>
        ))}
        {partialText && (
          <div className="voice-msg voice-msg-partial">
            <strong>识别中（上海话）</strong>
            <span>{partialText}</span>
          </div>
        )}
      </div>

      {error && <div className="voice-error">{error}</div>}
      {micError && <div className="voice-mic-hint" role="status">{micError}</div>}

      {demoSamples.length > 0 && voiceConfigured !== false && (
        <div className="voice-agent-actions" style={{ marginBottom: 12 }}>
          <p className="voice-empty" style={{ marginBottom: 8 }}>快捷例句（真实 LLM + TTS）</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {demoSamples.map((sample) => (
              <button
                key={sample.label}
                type="button"
                className="voice-btn"
                disabled={busy && state !== 'idle' && state !== 'listening'}
                onClick={() => void handleDemo(sample.utterance)}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {voiceConfigured === true && (
        <form className="voice-composer" onSubmit={(e) => void handleSendText(e)}>
          <input
            type="text"
            className="voice-composer-input"
            value={draft}
            placeholder="输入一句话，走真实对话与上海话播报…"
            onChange={(e) => setDraft(e.target.value)}
            aria-label="文字输入"
          />
          <button
            type="submit"
            className="voice-btn voice-btn-primary"
            disabled={!draft.trim() || sending}
          >
            发送
          </button>
        </form>
      )}

      <div className="voice-agent-actions">
        {!started ? (
          <button
            type="button"
            className="voice-btn voice-btn-primary"
            disabled={voiceConfigured === false}
            onClick={() => void handleConnect()}
          >
            {voiceConfigured === false ? '语音服务未就绪' : '连接助手'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`voice-btn ${micActive ? 'voice-btn-danger' : ''}`}
              onClick={() => void handleMicToggle()}
              title="可选：浏览器麦克风"
            >
              {micActive ? '结束本句' : '开麦（可选）'}
            </button>
            <button type="button" className="voice-btn" onClick={bargeIn} disabled={state !== 'speaking'}>
              打断播报
            </button>
            <button type="button" className="voice-btn voice-btn-ghost" onClick={handleDisconnect}>
              断开
            </button>
          </>
        )}
      </div>
    </div>
  )
}
