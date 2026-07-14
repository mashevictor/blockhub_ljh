import { useState } from 'react'
import { fetchVoiceConfig } from '../../api/client'
import { testFlowApi } from '../../lib/flowModuleApis'
import {
  runShanghaiVoiceSmoke,
  shanghaiIngressApi,
  shanghaiModuleInputApi,
} from '../../lib/shanghaiVoiceSmoke'
import { SHANGHAI_VOICE_APP_ID } from '../../lib/shanghaiVoiceProject'

interface Props {
  appKey?: string
  webUrl: string
  onReport?: (text: string) => void
}

/** 数据接口 Tab · 上海话真链路 + 可验 mock */
export default function PlazaShanghaiVoiceApiChecks({
  appKey = SHANGHAI_VOICE_APP_ID,
  webUrl,
  onReport,
}: Props) {
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
    <div className="plaza-orch-voice-checks" aria-label="上海话接口验证">
      <p className="plaza-orch-tab-hint">
        <span className="plaza-orch-badge is-real">真链路</span>
        语音配置 / WS
        <span className="plaza-orch-badge is-mock">mock</span>
        runtime 编排 REST
      </p>

      <div className="plaza-orch-voice-block">
        <h4 className="plaza-orch-voice-block-title">
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span> 上海话 · 真接口
        </h4>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">GET</span>
          <div className="plaza-orch-voice-row-body">
            <div>语音配置 <span className="plaza-orch-badge is-real">真</span></div>
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
          <span className="plaza-orch-api-tag">WS</span>
          <div className="plaza-orch-voice-row-body">
            <div>上海话 Agent <span className="plaza-orch-badge is-real">真</span></div>
            <code>/api/v1/voice/shanghai-agent</code>
            <div className="plaza-orch-voice-actions">
              <a className="btn-primary-sm" href={webUrl} target="_blank" rel="noreferrer">
                去网页对练
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="plaza-orch-voice-block">
        <h4 className="plaza-orch-voice-block-title">
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span> 编排 REST · 可验 mock
        </h4>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">IN</span>
          <div className="plaza-orch-voice-row-body">
            <code>{shanghaiIngressApi(appKey).path}</code>
            <div className="plaza-orch-voice-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run('测 ingress', async () => {
                    const r = await testFlowApi(shanghaiIngressApi(appKey))
                    return `【mock】HTTP ${r.status} · ${r.ms}ms\n${JSON.stringify(r.body).slice(0, 280)}`
                  })
                }
              >
                测试
              </button>
            </div>
          </div>
        </div>
        <div className="plaza-orch-voice-row">
          <span className="plaza-orch-api-tag">IN</span>
          <div className="plaza-orch-voice-row-body">
            <code>{shanghaiModuleInputApi(appKey).path}</code>
            <div className="plaza-orch-voice-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={busy}
                onClick={() =>
                  run('测模块 IN', async () => {
                    const r = await testFlowApi(shanghaiModuleInputApi(appKey))
                    return `【mock】HTTP ${r.status} · ${r.ms}ms\n${JSON.stringify(r.body).slice(0, 280)}`
                  })
                }
              >
                测试
              </button>
              <button
                type="button"
                className="btn-primary-sm"
                disabled={busy}
                onClick={() =>
                  run('冒烟', async () => {
                    const r = await runShanghaiVoiceSmoke(appKey)
                    return r.summary
                  })
                }
              >
                跑冒烟
              </button>
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
