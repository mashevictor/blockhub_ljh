/**
 * 行业预览 · 非表单能力：只读真 API / 配置态，禁止假 KPI、假列表。
 */
import { useCallback, useEffect, useState } from 'react'
import { GtgtStepComposer, type GtgtStep } from '@blockhub/web-core/gtgt'
import type { IndustryRuntimeScene } from '../data/industryRuntimeScenes'

async function apiJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

const NL_STEPS: GtgtStep[] = [
  { key: 'question', label: '自然语言问题', placeholder: '本月待审批有多少？', inputType: 'textarea' },
]

export const READONLY_LIVE_CAPS = [
  'kb_document',
  'chat_qa',
  'notify_inapp',
  'notify_im',
  'erp_connector',
  'data_nl_query',
  'chart_dashboard',
] as const

export type ReadonlyLiveCap = (typeof READONLY_LIVE_CAPS)[number]

export function isReadonlyLiveCap(cap: string): cap is ReadonlyLiveCap {
  return (READONLY_LIVE_CAPS as readonly string[]).includes(cap)
}

export function LiveReadonlySceneBody({
  cap,
  scene,
  token,
}: {
  cap: string
  scene: IndustryRuntimeScene
  token: string
}) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [kpis, setKpis] = useState<Array<{ label: string; value: string; hint?: string }>>([])
  const [nlVals, setNlVals] = useState<Record<string, string>>({})
  const [nlMsg, setNlMsg] = useState('')
  const [nlBusy, setNlBusy] = useState(false)
  const [nlReset, setNlReset] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    setLines([])
    setKpis([])
    try {
      if (cap === 'kb_document') {
        const stats = await apiJson<{ knowledge_bases?: number; documents?: number }>(
          '/api/v1/kb/stats',
          token,
        ).catch((): { knowledge_bases?: number; documents?: number } => ({}))
        const docs = await apiJson<{ items?: Array<{ title?: string; name?: string }> }>(
          '/api/v1/kb/documents',
          token,
        ).catch((): { items: Array<{ title?: string; name?: string }> } => ({ items: [] }))
        const items = docs.items || []
        setKpis([
          { label: '知识库', value: String(stats.knowledge_bases ?? 0), hint: '真统计' },
          { label: '文档', value: String(stats.documents ?? items.length), hint: '真统计' },
        ])
        setLines(
          items.length
            ? items.slice(0, 12).map((d) => String(d.title || d.name || '未命名文档'))
            : ['空库无文档 — 上传后出现在正式 Runtime 知识库'],
        )
      } else if (cap === 'chat_qa') {
        const cfg = await apiJson<{ model?: string; provider?: string }>(
          '/api/v1/chat/config',
          token,
        ).catch((): { model?: string; provider?: string } => ({}))
        setLines([
          cfg.model || cfg.provider
            ? `问答服务已配置${cfg.model ? ` · ${cfg.model}` : ''}`
            : '问答服务配置未返回详情',
          '对话会话请在发布后的 /r/应用 Chat Widget 中使用（本预览不造假消息）。',
        ])
      } else if (cap === 'notify_inapp') {
        const data = await apiJson<{ items?: Array<{ title?: string; body?: string; read?: boolean }> }>(
          '/api/v1/notifications',
          token,
        ).catch((): { items: Array<{ title?: string; body?: string; read?: boolean }> } => ({
          items: [],
        }))
        const items = data.items || []
        setLines(
          items.length
            ? items.slice(0, 12).map((n) => `${n.read ? '已读' : '未读'} · ${n.title || n.body || '通知'}`)
            : ['空库无站内信'],
        )
      } else if (cap === 'notify_im' || cap === 'erp_connector') {
        type Conn = { name?: string; connector_type?: string; status?: string }
        const data = await apiJson<{ items?: Conn[]; connectors?: Conn[] }>(
          '/api/v1/integrations',
          token,
        ).catch((): { items: Conn[]; connectors?: Conn[] } => ({ items: [] }))
        const all = data.items || data.connectors || []
        const imTypes = new Set(['wecom', 'dingtalk', 'feishu', 'slack', 'im'])
        const filtered =
          cap === 'notify_im'
            ? all.filter((c: Conn) => imTypes.has(String(c.connector_type || '').toLowerCase()))
            : all.filter((c: Conn) => !imTypes.has(String(c.connector_type || '').toLowerCase()))
        setLines(
          filtered.length
            ? filtered.map(
                (c: Conn) =>
                  `${c.name || '未命名'} · ${c.connector_type || '—'} · ${c.status || '未知'}`,
              )
            : [
                cap === 'notify_im'
                  ? '未配置 IM Webhook（企微/钉钉/飞书）— 正式 Runtime 中添加连接器'
                  : '未配置 ERP / 业务系统对接 — 正式 Runtime 中添加连接器',
              ],
        )
      } else if (cap === 'chart_dashboard') {
        const [dash, kb] = await Promise.all([
          apiJson<{ pending_approvals?: number; chat_sessions?: number }>(
            '/api/v1/stats/dashboard',
            token,
          ).catch((): { pending_approvals?: number; chat_sessions?: number } => ({})),
          apiJson<{ knowledge_bases?: number; documents?: number }>('/api/v1/kb/stats', token).catch(
            (): { knowledge_bases?: number; documents?: number } => ({}),
          ),
        ])
        setKpis([
          { label: '待审批', value: String(dash.pending_approvals ?? 0), hint: '真统计' },
          { label: '会话', value: String(dash.chat_sessions ?? 0), hint: '真统计' },
          { label: '知识库', value: String(kb.knowledge_bases ?? 0), hint: '真统计' },
          { label: '文档', value: String(kb.documents ?? 0), hint: '真统计' },
        ])
        setLines(['看板数字来自 /stats/dashboard 与 /kb/stats；空库为 0，无演示假数。'])
      } else if (cap === 'data_nl_query') {
        setLines(['用下方 Gtgt 提问；结果来自 /reports/nl-query，无历史假记录。'])
      } else {
        setLines([`能力 ${cap}：只读预览未单独实现，请发布后使用 /r/应用。`])
      }
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }, [cap, token])

  useEffect(() => {
    void load()
  }, [load, scene.id])

  const runNl = async () => {
    const q = nlVals.question?.trim()
    if (!q || nlBusy) return
    setNlBusy(true)
    setNlMsg('')
    try {
      const data = await apiJson<{ answer?: string; summary?: string; error?: string }>(
        '/api/v1/reports/nl-query',
        token,
        { method: 'POST', body: JSON.stringify({ question: q }) },
      )
      setNlMsg(data.answer || data.summary || data.error || '已返回（无文本字段）')
      setNlReset((k) => k + 1)
      setNlVals({})
    } catch (e) {
      setNlMsg(`查询失败：${String(e)}`)
    } finally {
      setNlBusy(false)
    }
  }

  return (
    <div className="irp-stack">
      <p className="irp-summary">
        真 API · {cap} ·{' '}
        {cap === 'data_nl_query' ? '可提问' : '只读 / 配置态'} · 禁止假业务数据
      </p>
      {loading ? <p className="irp-summary">加载中…</p> : null}
      {err ? <p className="irp-summary">加载失败：{err}</p> : null}
      {kpis.length > 0 ? (
        <div className="irp-kpi-row">
          {kpis.map((k) => (
            <div key={k.label} className="irp-kpi">
              <span>{k.label}</span>
              <strong>{k.value}</strong>
              <em>{k.hint || '—'}</em>
            </div>
          ))}
        </div>
      ) : null}
      <section className="irp-panel">
        <h3>{scene.name}</h3>
        {lines.map((t) => (
          <p key={t} className="irp-summary">
            {t}
          </p>
        ))}
      </section>
      {cap === 'data_nl_query' ? (
        <section className="irp-panel irp-gtgt-panel">
          <GtgtStepComposer
            title="自然语言查数"
            accent="#6366f1"
            variant="soft"
            flowHint=">> 单字段提问 → 调真 API"
            steps={NL_STEPS}
            values={nlVals}
            onChange={(k, v) => setNlVals((p) => ({ ...p, [k]: v }))}
            onComplete={() => void runNl()}
            busy={nlBusy}
            resetKey={nlReset}
            submitLabel="查询"
          >
            {nlMsg ? <p className="irp-summary" style={{ marginTop: 10 }}>{nlMsg}</p> : null}
          </GtgtStepComposer>
        </section>
      ) : null}
    </div>
  )
}
