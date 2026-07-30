import { useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { api, fetchVoiceConfig } from '../../api/client'
import { runShanghaiVoiceSmoke } from '../../lib/shanghaiVoiceSmoke'

interface Props {
  webUrl: string
  onReport?: (text: string) => void
}

/** 数据接口 Tab · 仅上海话真业务链路（不含 runtime mock） */
export default function PlazaShanghaiVoiceApiChecks({ webUrl, onReport }: Props) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')

  const report = (text: string) => {
    setLog(text)
    onReport?.(text)
  }

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(true)
    report(t('home.plaza.voice.busy', { label }))
    try {
      report(await fn())
    } catch (e) {
      report(t('home.plaza.voice.fail', {
        label,
        error: e instanceof Error ? e.message : String(e),
      }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="plaza-orch-voice-checks" aria-label={t('home.plaza.voice.aria')}>
      <p className="plaza-orch-tab-hint">
        <span className="plaza-orch-badge is-real">{t('home.plaza.voice.badge_real')}</span>
        {t('home.plaza.voice.hint')}
      </p>

      <div className="plaza-orch-voice-block">
        <h4 className="plaza-orch-voice-block-title">
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span> {t('home.plaza.voice.block_title')}
        </h4>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">GET</span>
          <div className="plaza-orch-voice-row-body">
            <div>{t('home.plaza.voice.cfg_label')}</div>
            <code>/api/v1/voice/config</code>
            <div className="plaza-orch-voice-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run(t('home.plaza.voice.label.cfg'), async () => {
                    const j = await fetchVoiceConfig()
                    return t('home.plaza.voice.report.cfg', {
                      configured: String(j.configured),
                      agent: j.agent_id,
                      llm: j.llm_provider ?? '',
                      ws: j.ws_url || j.ws_path || '',
                    })
                  })
                }
              >
                {t('home.plaza.voice.test')}
              </button>
            </div>
          </div>
        </div>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">GET</span>
          <div className="plaza-orch-voice-row-body">
            <div>{t('home.plaza.voice.status_label')}</div>
            <code>/api/v1/voice/status · /api/v1/voice/auth-probe</code>
            <div className="plaza-orch-voice-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run(t('home.plaza.voice.label.status'), async () => {
                    const st = await api.get('/voice/status')
                    return t('home.plaza.voice.report.status', {
                      body: JSON.stringify(st.data, null, 2),
                    })
                  })
                }
              >
                {t('home.plaza.voice.test_status')}
              </button>
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run(t('home.plaza.voice.label.auth'), async () => {
                    const auth = await api.get('/voice/auth-probe')
                    return t('home.plaza.voice.report.auth', {
                      body: JSON.stringify(auth.data, null, 2),
                    })
                  })
                }
              >
                {t('home.plaza.voice.test_auth')}
              </button>
              <button
                type="button"
                className="btn-primary-sm"
                disabled={busy}
                onClick={() =>
                  run(t('home.plaza.voice.label.smoke'), async () => {
                    const r = await runShanghaiVoiceSmoke(t)
                    return r.summary
                  })
                }
              >
                {t('home.plaza.voice.smoke_btn')}
              </button>
            </div>
          </div>
        </div>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">WS</span>
          <div className="plaza-orch-voice-row-body">
            <div>{t('home.plaza.voice.agent_label')}</div>
            <code>/api/v1/voice/shanghai-agent</code>
            <div className="plaza-orch-voice-actions">
              <a className="btn-primary-sm" href={webUrl} target="_blank" rel="noreferrer">
                {t('home.plaza.voice.open_web')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {log && (
        <div className="plaza-orch-analysis" role="status">
          <strong>{t('home.plaza.voice.result')}</strong>
          <p>{log}</p>
        </div>
      )}
    </div>
  )
}
