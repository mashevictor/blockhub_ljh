import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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

export default function VoiceAgentPanel() {
  const t = useT()
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
  const stateLabel = t(`home.plaza.voice_panel.state.${state}`)
  const stateDisplay = stateLabel === `home.plaza.voice_panel.state.${state}` ? state : stateLabel

  return (
    <div className="voice-agent-panel">
      <div className="voice-agent-header">
        <div>
          <h2>{t('home.plaza.voice_panel.title')}</h2>
          <p>{t('home.plaza.voice_panel.sub')}</p>
        </div>
        <span className={`voice-state-badge voice-state-${state}`}>{stateDisplay}</span>
      </div>

      {voiceConfigured === false && (
        <div className="voice-setup-banner" role="alert">
          <strong>{t('home.plaza.voice_panel.setup_title')}</strong>
          <p>{t('home.plaza.voice_panel.setup_body')}</p>
        </div>
      )}

      {voiceConfigured === null && (
        <p className="voice-empty">{t('home.plaza.voice_panel.checking')}</p>
      )}

      <div className="voice-agent-messages">
        {messages.length === 0 && !partialText && (
          <div className="voice-welcome">
            <p className="voice-welcome-title">{t('home.plaza.voice_panel.welcome_title')}</p>
            <p className="voice-empty">{t('home.plaza.voice_panel.welcome_body')}</p>
            <ol className="voice-welcome-steps">
              <li>{t('home.plaza.voice_panel.step1')}</li>
              <li>{t('home.plaza.voice_panel.step2')}</li>
              <li>{t('home.plaza.voice_panel.step3')}</li>
            </ol>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={`${m.role}-${idx}`} className={`voice-msg voice-msg-${m.role}`}>
            <strong>{m.role === 'user' ? t('home.plaza.voice_panel.you') : t('home.plaza.voice_panel.assistant')}</strong>
            <span>{m.text}</span>
          </div>
        ))}
        {partialText && (
          <div className="voice-msg voice-msg-partial">
            <strong>{t('home.plaza.voice_panel.partial')}</strong>
            <span>{partialText}</span>
          </div>
        )}
      </div>

      {error && <div className="voice-error">{error}</div>}
      {micError && <div className="voice-mic-hint" role="status">{micError}</div>}

      {demoSamples.length > 0 && voiceConfigured !== false && (
        <div className="voice-agent-actions" style={{ marginBottom: 12 }}>
          <p className="voice-empty" style={{ marginBottom: 8 }}>{t('home.plaza.voice_panel.samples')}</p>
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
            placeholder={t('home.plaza.voice_panel.ph')}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t('home.plaza.voice_panel.input_aria')}
          />
          <button
            type="submit"
            className="voice-btn voice-btn-primary"
            disabled={!draft.trim() || sending}
          >
            {t('home.plaza.voice_panel.send')}
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
            {voiceConfigured === false ? t('home.plaza.voice_panel.not_ready') : t('home.plaza.voice_panel.connect')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`voice-btn ${micActive ? 'voice-btn-danger' : ''}`}
              onClick={() => void handleMicToggle()}
              title={t('home.plaza.voice_panel.mic_title')}
            >
              {micActive ? t('home.plaza.voice_panel.mic_stop') : t('home.plaza.voice_panel.mic_start')}
            </button>
            <button type="button" className="voice-btn" onClick={bargeIn} disabled={state !== 'speaking'}>
              {t('home.plaza.voice_panel.barge')}
            </button>
            <button type="button" className="voice-btn voice-btn-ghost" onClick={handleDisconnect}>
              {t('home.plaza.voice_panel.disconnect')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
