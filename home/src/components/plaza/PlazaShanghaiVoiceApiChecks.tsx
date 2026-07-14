import { useState } from 'react'
import { api, fetchVoiceConfig } from '../../api/client'
import { runShanghaiVoiceSmoke } from '../../lib/shanghaiVoiceSmoke'

interface Props {
  webUrl: string
  onReport?: (text: string) => void
}

/** 数据接口 Tab · 仅上海话真业务链路（不含 runtime mock） */
export default function PlazaShanghaiVoiceApiChecks({ webUrl, onReport }: Props) {
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')

  const report = (text: string) => {
    setLog(text)
    onReport?.(text)
  }

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(true)
    report(`${label}…`)
    try {
      report(await fn())
    } catch (e) {
      report(`${label}失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="plaza-orch-voice-checks" aria-label="上海话真业务验证">
      <p className="plaza-orch-tab-hint">
        <span className="plaza-orch-badge is-real">真链路</span>
        下列全部为生产语音业务接口。编排 REST mock 已从验收中移除。
      </p>

      <div className="plaza-orch-voice-block">
        <h4 className="plaza-orch-voice-block-title">
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span> 上海话 · 业务接口
        </h4>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">GET</span>
          <div className="plaza-orch-voice-row-body">
            <div>语音配置</div>
            <code>/api/v1/voice/config</code>
            <div className="plaza-orch-voice-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run('测 voice 配置', async () => {
                    const j = await fetchVoiceConfig()
                    return (
                      `【真链路】voice/config\n` +
                      `configured: ${j.configured}\n` +
                      `agent: ${j.agent_id}\n` +
                      `llm: ${j.llm_provider}\n` +
                      `ws: ${j.ws_url || j.ws_path}`
                    )
                  })
                }
              >
                测试
              </button>
            </div>
          </div>
        </div>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">GET</span>
          <div className="plaza-orch-voice-row-body">
            <div>服务状态 / ASR 鉴权</div>
            <code>/api/v1/voice/status · /api/v1/voice/auth-probe</code>
            <div className="plaza-orch-voice-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run('测 status', async () => {
                    const st = await api.get('/voice/status')
                    return `【真链路】status\n${JSON.stringify(st.data, null, 2)}`
                  })
                }
              >
                测 status
              </button>
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run('测 auth-probe', async () => {
                    const auth = await api.get('/voice/auth-probe')
                    return `【真链路】auth-probe\n${JSON.stringify(auth.data, null, 2)}`
                  })
                }
              >
                测鉴权
              </button>
              <button
                type="button"
                className="btn-primary-sm"
                disabled={busy}
                onClick={() =>
                  run('冒烟', async () => {
                    const r = await runShanghaiVoiceSmoke()
                    return r.summary
                  })
                }
              >
                跑真链路冒烟
              </button>
            </div>
          </div>
        </div>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">WS</span>
          <div className="plaza-orch-voice-row-body">
            <div>上海话 Agent · 文字 / 例句 / 开麦</div>
            <code>/api/v1/voice/shanghai-agent</code>
            <div className="plaza-orch-voice-actions">
              <a className="btn-primary-sm" href={webUrl} target="_blank" rel="noreferrer">
                打开网页对练
              </a>
            </div>
          </div>
        </div>
      </div>

      {log && (
        <div className="plaza-orch-analysis" role="status">
          <strong>验证结果</strong>
          <p>{log}</p>
        </div>
      )}
    </div>
  )
}
