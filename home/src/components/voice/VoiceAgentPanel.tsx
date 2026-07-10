import { useEffect, useMemo, useState } from 'react'
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
    connect,
    disconnect,
    startMic,
    stopMic,
    bargeIn,
    simulateUtterance,
  } = useVoiceWebSocket(sessionId)

  const [started, setStarted] = useState(false)
  const [voiceConfigured, setVoiceConfigured] = useState<boolean | null>(null)
  const [demoSamples, setDemoSamples] = useState<Array<{ label: string; utterance: string }>>([])

  useEffect(() => {
    api.get<{ configured: boolean; demo_samples?: Array<{ label: string; utterance: string }> }>('/voice/config')
      .then((res) => {
        setVoiceConfigured(res.data.configured)
        setDemoSamples(res.data.demo_samples ?? [])
      })
      .catch(() => setVoiceConfigured(false))
  }, [])

  const handleStart = async () => {
    setStarted(true)
    await connect()
    await startMic()
  }

  const handleStop = () => {
    stopMic()
  }

  const handleDemo = async (utterance: string) => {
    if (!started) {
      setStarted(true)
      await connect()
    }
    await simulateUtterance(utterance)
  }

  const handleDisconnect = () => {
    setStarted(false)
    disconnect()
  }

  return (
    <div className="voice-agent-panel">
      <div className="voice-agent-header">
        <div>
          <h2>上海话语音 Agent</h2>
          <p>电信星辰方言 ASR/TTS · DeepSeek 语义理解 · 支持打断</p>
        </div>
        <span className={`voice-state-badge voice-state-${state}`}>{STATE_LABEL[state] || state}</span>
      </div>

      {voiceConfigured === false && (
        <div className="voice-setup-banner" role="alert">
          <strong>语音服务未配置</strong>
          <p>服务器未设置电信星辰 API Key，无法连接实时语音。请联系管理员配置 <code>TELEAI_*</code> 环境变量后重试。</p>
          <p className="voice-setup-hint">页面可正常打开；配置完成后点击「开始说话」即可体验。</p>
        </div>
      )}

      {voiceConfigured === null && (
        <p className="voice-empty">正在检查语音服务…</p>
      )}

      <div className="voice-agent-messages">
        {messages.length === 0 && !partialText && (
          <div className="voice-welcome">
            <p className="voice-welcome-title">这是独立语音演示页（方案 B）</p>
            <p className="voice-empty">点击下方「开始说话」，用上海话或普通话提问；识别结果与回复会显示在这里。</p>
            <ol className="voice-welcome-steps">
              <li>允许浏览器使用麦克风</li>
              <li>说完一句后点「结束本句」或等待自动识别</li>
              <li>可随时点「打断」停止播报</li>
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

      {demoSamples.length > 0 && voiceConfigured !== false && (
        <div className="voice-agent-actions" style={{ marginBottom: 12 }}>
          <p className="voice-empty" style={{ marginBottom: 8 }}>试试例句（模拟 ASR + DeepSeek + 上海话 TTS）</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {demoSamples.map((sample) => (
              <button
                key={sample.label}
                type="button"
                className="voice-btn"
                onClick={() => void handleDemo(sample.utterance)}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="voice-agent-actions">
        {!started ? (
          <button
            type="button"
            className="voice-btn voice-btn-primary"
            disabled={voiceConfigured === false}
            onClick={() => void handleStart()}
          >
            {voiceConfigured === false ? '语音服务未就绪' : '开始说话'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`voice-btn ${micActive ? 'voice-btn-danger' : 'voice-btn-primary'}`}
              onClick={() => (micActive ? handleStop() : void startMic())}
            >
              {micActive ? '结束本句' : '继续说话'}
            </button>
            <button type="button" className="voice-btn" onClick={bargeIn}>
              打断
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
