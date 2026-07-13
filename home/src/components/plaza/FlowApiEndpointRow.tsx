import { useEffect, useState } from 'react'
import {
  buildApiCurl,
  testFlowApi,
  type ApiTestResult,
  type FlowApiEndpoint,
} from '../../lib/flowModuleApis'

interface Props {
  title: string
  api: FlowApiEndpoint
  variant: 'input' | 'output'
  highlighted?: boolean
  compact?: boolean
  /** 外部触发测试（如 >> 菜单「调用模块」） */
  testTrigger?: number
}

export default function FlowApiEndpointRow({
  title,
  api,
  variant,
  highlighted = false,
  compact = false,
  testTrigger = 0,
}: Props) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null)

  const copyCurl = () => {
    void navigator.clipboard.writeText(buildApiCurl(api))
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testFlowApi(api))
    } catch {
      setTestResult({ ok: false, status: 0, body: '请求失败，请稍后重试', ms: 0 })
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    if (!testTrigger) return
    void runTest()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随 testTrigger 脉冲触发
  }, [testTrigger])

  return (
    <div
      className={`plaza-flow-api-row variant-${variant}${highlighted ? ' highlighted' : ''}${compact ? ' compact' : ''}`}
    >
      <div className="plaza-flow-api-row-head">
        <span className={`plaza-dual-rail-io-tag ${variant}`}>{title}</span>
        <span className="plaza-flow-api-row-actions">
          <button type="button" className="btn-ghost-sm" onClick={copyCurl}>复制 curl</button>
          <button type="button" className="btn-ghost-sm" disabled={testing} onClick={() => void runTest()}>
            {testing ? '测试中…' : '测试'}
          </button>
        </span>
      </div>
      <code className="plaza-flow-api-path">
        <span className={`plaza-dual-rail-method method-${api.method.toLowerCase()}`}>{api.method}</span>
        {api.path}
      </code>
      {!compact && <p className="plaza-flow-api-desc">{api.description}</p>}
      {testResult && (
        <pre className={`plaza-flow-api-test${testResult.ok ? ' ok' : ' err'}`} aria-live="polite">
          {testResult.status > 0 ? `HTTP ${testResult.status} · ${testResult.ms}ms\n` : ''}
          {typeof testResult.body === 'string' ? testResult.body : JSON.stringify(testResult.body, null, 2)}
        </pre>
      )}
    </div>
  )
}
