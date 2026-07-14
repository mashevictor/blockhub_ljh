import { useCallback, useEffect, useState } from 'react'
import {
  apiNodeMap,
  buildApiCurl,
  buildFallbackFlowApis,
  dialFlowModuleApis,
  loadCachedFlowApis,
  testFlowApi,
  type FlowApiEndpoint,
  type FlowApiResult,
  type ApiTestResult,
} from '../../lib/flowModuleApis'
import { flowStepsFingerprint, type ModuleFlowStep } from '../../lib/plazaModuleFlow'

interface Props {
  appKey: string
  appName: string
  steps: ModuleFlowStep[]
  activeNodeId: string | null
  onDialAll?: () => void
}

function ApiRow({ title, api }: { title: string; api: FlowApiEndpoint }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null)

  const copyCurl = () => {
    void navigator.clipboard.writeText(buildApiCurl(api))
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testFlowApi(api)
      setTestResult(res)
    } catch {
      setTestResult({ ok: false, status: 0, body: '请求失败，请稍后重试', ms: 0 })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="plaza-mflow-api-row">
      <div className="plaza-mflow-api-row-head">
        <span className="plaza-mflow-api-tag">{title}</span>
        <span className="plaza-mflow-api-actions">
          <button type="button" className="btn-ghost-sm" onClick={copyCurl}>复制 curl</button>
          <button type="button" className="btn-ghost-sm" disabled={testing} onClick={() => void runTest()}>
            {testing ? '测试中…' : '测试'}
          </button>
        </span>
      </div>
      <code className="plaza-mflow-api-path">
        <span className={`plaza-mflow-api-method method-${api.method.toLowerCase()}`}>{api.method}</span>
        {api.path}
      </code>
      <p className="plaza-mflow-api-desc">{api.description}</p>
      {testResult && (
        <pre className={`plaza-mflow-api-test${testResult.ok ? ' ok' : ' err'}`} aria-live="polite">
          {testResult.status > 0 ? `HTTP ${testResult.status} · ${testResult.ms}ms\n` : ''}
          {typeof testResult.body === 'string' ? testResult.body : JSON.stringify(testResult.body, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function ModuleApiPanel({ appKey, appName, steps, activeNodeId }: Props) {
  const fingerprint = flowStepsFingerprint(steps)
  const [result, setResult] = useState<FlowApiResult | null>(() =>
    loadCachedFlowApis(appKey, fingerprint),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dial = useCallback(async (force = false) => {
    if (force) {
      try {
        localStorage.removeItem(`blockhub_flow_apis_${appKey}`)
      } catch {
        /* ignore */
      }
    }
    setLoading(true)
    setError('')
    try {
      const data = await dialFlowModuleApis({
        appKey,
        appName,
        steps,
        force,
        onUpgrade: (upgraded) => setResult(upgraded),
      })
      setResult(data)
      setError('')
    } catch {
      const fallback = buildFallbackFlowApis(appKey, steps)
      setResult(fallback)
      setError('')
    } finally {
      setLoading(false)
    }
  }, [appKey, appName, steps])

  useEffect(() => {
    setResult(loadCachedFlowApis(appKey, fingerprint))
  }, [appKey, fingerprint])

  useEffect(() => {
    if (steps.length === 0) return
    const cached = loadCachedFlowApis(appKey, fingerprint)
    // 无缓存或仅有规则模拟时，强制走服务端大模型
    if (!cached || cached.source !== 'deepseek') {
      void dial(Boolean(cached && cached.source !== 'deepseek'))
    }
  }, [appKey, fingerprint, steps.length, dial])

  const nodeMap = apiNodeMap(result)
  const activeApi = activeNodeId ? nodeMap.get(activeNodeId) : null

  return (
    <div className="plaza-mflow-api-panel">
      <div className="plaza-mflow-api-panel-head">
        <div>
          <strong>模块数据接口</strong>
          <span className="plaza-mflow-api-source">
            {loading
              ? '大模型生成中…'
              : result?.source === 'deepseek'
                ? '大模型智能生成'
                : result
                  ? (result.llm_configured === false ? '未配置密钥 · 规则模拟' : '规则模拟（大模型失败）')
                  : '拨通中…'}
          </span>
        </div>
        <button
          type="button"
          className="btn-primary-sm plaza-mflow-dial-btn"
          disabled={loading || steps.length === 0}
          onClick={() => void dial(Boolean(result))}
        >
          {loading ? '拨通中…' : result ? '重新拨通' : '拨通全部模块'}
        </button>
      </div>

      {error && <p className="plaza-mflow-api-error" role="alert">{error}</p>}

      {!result && !loading && steps.length > 0 && (
        <p className="plaza-mflow-api-hint">正在生成各节点模拟 REST 接口…</p>
      )}

      {result && (
        <p className="plaza-mflow-api-hint">
          已为输入链、各模块、输出链生成模拟接口。可复制 curl 或直接点「测试」验证返回。
        </p>
      )}

      {activeApi && (
        <div className="plaza-mflow-api-active">
          <p className="plaza-mflow-api-active-title">
            <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
            当前节点：<strong>{activeApi.label}</strong>
          </p>
          <ApiRow title="流入接口（input）" api={activeApi.input_api} />
          <ApiRow title="流出接口（output）" api={activeApi.output_api} />
        </div>
      )}

      {result && (
        <details className="plaza-mflow-api-all">
          <summary>查看全部 {result.nodes.length} 个节点接口</summary>
          <ul className="plaza-mflow-api-list">
            {result.nodes.map((n) => (
              <li key={n.node_id} className={activeNodeId === n.node_id ? 'on' : ''}>
                <span className="plaza-mflow-api-list-label">{n.label}</span>
                <code>{n.input_api.method} {n.input_api.path}</code>
                <code>{n.output_api.method} {n.output_api.path}</code>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default ModuleApiPanel
