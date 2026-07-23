import { useEffect, useMemo, useState } from 'react'
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
  /** 非可编排态禁用测试 */
  testDisabled?: boolean
  /** 展示输入/输出字段示例（选中节点联动） */
  showFields?: boolean
}

function flattenFields(
  value: unknown,
  prefix = '',
): Array<{ path: string; type: string; example: string }> {
  if (value === null || value === undefined) {
    return [{ path: prefix || '(empty)', type: 'null', example: 'null' }]
  }
  if (Array.isArray(value)) {
    const example = JSON.stringify(value).slice(0, 80)
    return [{ path: prefix || '[]', type: 'array', example }]
  }
  if (typeof value !== 'object') {
    return [{
      path: prefix || 'value',
      type: typeof value,
      example: String(value).slice(0, 80),
    }]
  }
  const rows: Array<{ path: string; type: string; example: string }> = []
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flattenFields(v, path))
    } else {
      rows.push({
        path,
        type: Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v,
        example: v === undefined ? '' : String(JSON.stringify(v)).replace(/^"|"$/g, '').slice(0, 64),
      })
    }
  }
  return rows
}

export default function FlowApiEndpointRow({
  title,
  api,
  variant,
  highlighted = false,
  compact = false,
  testTrigger = 0,
  testDisabled = false,
  showFields = true,
}: Props) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null)

  const fields = useMemo(() => {
    if (api.sample_body && Object.keys(api.sample_body).length > 0) {
      return flattenFields(api.sample_body)
    }
    // 无 sample 时给可读的默认字段，避免「选了也空白」
    if (variant === 'input') {
      return [
        { path: 'trace_id', type: 'string', example: 'demo-trace' },
        { path: 'payload', type: 'object', example: '{ ... }' },
      ]
    }
    return [
      { path: 'status', type: 'string', example: 'ok' },
      { path: 'data', type: 'object', example: '{ ... }' },
    ]
  }, [api.sample_body, variant])

  const copyCurl = () => {
    void navigator.clipboard.writeText(buildApiCurl(api))
  }

  const runTest = async () => {
    if (testDisabled) return
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
    setTestResult(null)
  }, [api.path, api.method])

  useEffect(() => {
    if (!testTrigger || testDisabled) return
    void runTest()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随 testTrigger 脉冲触发
  }, [testTrigger])

  return (
    <div
      className={`plaza-flow-api-row variant-${variant}${highlighted ? ' highlighted' : ''}${compact ? ' compact' : ''}${testDisabled ? ' is-test-locked' : ''}`}
    >
      <div className="plaza-flow-api-row-head">
        <span className={`plaza-dual-rail-io-tag ${variant}`}>{title}</span>
        <span className="plaza-flow-api-row-actions">
          <button type="button" className="btn-ghost-sm" onClick={copyCurl}>复制 curl</button>
          <button
            type="button"
            className="btn-ghost-sm"
            disabled={testing || testDisabled}
            title={testDisabled ? '联调测试请在 Runtime 进行' : undefined}
            onClick={() => void runTest()}
          >
            {testing ? '测试中…' : '测试'}
          </button>
        </span>
      </div>
      <code className="plaza-flow-api-path">
        <span className={`plaza-dual-rail-method method-${api.method.toLowerCase()}`}>{api.method}</span>
        {api.path}
      </code>
      {api.description && (
        <p className="plaza-flow-api-desc">{api.description}</p>
      )}

      {showFields && (
        <div className="plaza-flow-api-fields">
          <div className="plaza-flow-api-fields-head">
            {variant === 'input' ? '输入字段' : '输出字段'}
          </div>
          <ul>
            {fields.map((f) => (
              <li key={f.path}>
                <code className="plaza-flow-api-field-name">{f.path}</code>
                <span className="plaza-flow-api-field-type">{f.type}</span>
                {f.example && <span className="plaza-flow-api-field-ex">{f.example}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {testDisabled && (
        <p className="plaza-flow-api-lock">只读契约 · 联调请打开 Runtime</p>
      )}
      {testResult && (
        <pre className={`plaza-flow-api-test${testResult.ok ? ' ok' : ' err'}`} aria-live="polite">
          {testResult.status > 0 ? `HTTP ${testResult.status} · ${testResult.ms}ms\n` : ''}
          {typeof testResult.body === 'string' ? testResult.body : JSON.stringify(testResult.body, null, 2)}
        </pre>
      )}
    </div>
  )
}
