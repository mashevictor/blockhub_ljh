import { useCallback, useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
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
      setTestResult({ ok: false, status: 0, body: t('home.plaza.api.req_fail'), ms: 0 })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="plaza-mflow-api-row">
      <div className="plaza-mflow-api-row-head">
        <span className="plaza-mflow-api-tag">{title}</span>
        <span className="plaza-mflow-api-actions">
          <button type="button" className="btn-ghost-sm" onClick={copyCurl}>{t('home.plaza.api.copy_curl')}</button>
          <button type="button" className="btn-ghost-sm" disabled={testing} onClick={() => void runTest()}>
            {testing ? t('home.plaza.api.testing') : t('home.plaza.api.test')}
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
  const t = useT()
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

  const sourceLabel = loading
    ? t('home.plaza.mapi.src.generating')
    : result?.source === 'deepseek'
      ? t('home.plaza.mapi.src.llm')
      : result
        ? (result.llm_configured === false
          ? t('home.plaza.mapi.src.no_key')
          : t('home.plaza.mapi.src.rule_fail'))
        : t('home.plaza.mapi.src.dialing')

  return (
    <div className="plaza-mflow-api-panel">
      <div className="plaza-mflow-api-panel-head">
        <div>
          <strong>{t('home.plaza.mapi.title')}</strong>
          <span className="plaza-mflow-api-source">{sourceLabel}</span>
        </div>
        <button
          type="button"
          className="btn-primary-sm plaza-mflow-dial-btn"
          disabled={loading || steps.length === 0}
          onClick={() => void dial(Boolean(result))}
        >
          {loading
            ? t('home.plaza.mapi.btn.dialing')
            : result
              ? t('home.plaza.mapi.btn.redial')
              : t('home.plaza.mapi.btn.dial_all')}
        </button>
      </div>

      {error && <p className="plaza-mflow-api-error" role="alert">{error}</p>}

      {!result && !loading && steps.length > 0 && (
        <p className="plaza-mflow-api-hint">{t('home.plaza.mapi.hint.generating')}</p>
      )}

      {result && (
        <p className="plaza-mflow-api-hint">{t('home.plaza.mapi.hint.ready')}</p>
      )}

      {activeApi && (
        <div className="plaza-mflow-api-active">
          <p className="plaza-mflow-api-active-title">
            <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
            {t('home.plaza.mapi.current')}<strong>{activeApi.label}</strong>
          </p>
          <ApiRow title={t('home.plaza.mapi.in')} api={activeApi.input_api} />
          <ApiRow title={t('home.plaza.mapi.out')} api={activeApi.output_api} />
        </div>
      )}

      {result && (
        <details className="plaza-mflow-api-all">
          <summary>{t('home.plaza.mapi.view_all', { n: result.nodes.length })}</summary>
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
