import { useMemo, useState } from 'react'
import { useVoiceWebSocket } from '../../hooks/useVoiceWebSocket'

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
  const sessionId = useMemo(() => `web-${crypto.randomUUID()}`, [])
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
  } = useVoiceWebSocket(sessionId)

  const [started, setStarted] = useState(false)

  const handleStart = async () => {
    setStarted(true)
    await connect()
    await startMic()
  }

  const handleStop = () => {
    stopMic()
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
          <p>电信星辰 ASR/TTS · DeepSeek · 支持打断</p>
        </div>
        <span className={`voice-state-badge voice-state-${state}`}>{STATE_LABEL[state] || state}</span>
      </div>

      <div className="voice-agent-messages">
        {messages.length === 0 && !partialText && (
          <p className="voice-empty">点击「开始说话」后，用上海话或普通话提问。</p>
        )}
        {messages.map((m, idx) => (
          <div key={`${m.role}-${idx}`} className={`voice-msg voice-msg-${m.role}`}>
            <strong>{m.role === 'user' ? '你' : '助手'}</strong>
            <span>{m.text}</span>
          </div>
        ))}
        {partialText && (
          <div className="voice-msg voice-msg-partial">
            <strong>识别中</strong>
            <span>{partialText}</span>
          </div>
        )}
      </div>

      {error && <div className="voice-error">{error}</div>}

      <div className="voice-agent-actions">
        {!started ? (
          <button type="button" className="voice-btn voice-btn-primary" onClick={() => void handleStart()}>
            开始说话
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
