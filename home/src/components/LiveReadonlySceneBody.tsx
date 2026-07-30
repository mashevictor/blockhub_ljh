/**
 * 行业预览 · 非表单能力：只读真 API / 配置态，禁止假 KPI、假列表。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

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
  const t = useT()
  const nlSteps = useMemo((): GtgtStep[] => [
    {
      key: 'question',
      label: t('home.liveOffice.readonly.nl_question'),
      placeholder: t('home.liveOffice.readonly.nl_ph'),
      inputType: 'textarea',
    },
  ], [t])
  const realStats = t('home.liveOffice.readonly.real_stats')
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
          { label: t('home.liveOffice.readonly.kpi_kb'), value: String(stats.knowledge_bases ?? 0), hint: realStats },
          { label: t('home.liveOffice.readonly.kpi_docs'), value: String(stats.documents ?? items.length), hint: realStats },
        ])
        setLines(
          items.length
            ? items.slice(0, 12).map((d) => String(d.title || d.name || t('home.liveOffice.readonly.unnamed_doc')))
            : [t('home.liveOffice.readonly.empty_docs')],
        )
      } else if (cap === 'chat_qa') {
        const cfg = await apiJson<{ model?: string; provider?: string }>(
          '/api/v1/chat/config',
          token,
        ).catch((): { model?: string; provider?: string } => ({}))
        setLines([
          cfg.model || cfg.provider
            ? t('home.liveOffice.readonly.chat_configured', {
              model: cfg.model ? t('home.liveOffice.readonly.chat_model_suffix', { model: cfg.model }) : '',
            })
            : t('home.liveOffice.readonly.chat_unconfigured'),
          t('home.liveOffice.readonly.chat_runtime_hint'),
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
            ? items.slice(0, 12).map((n) =>
              `${n.read ? t('home.liveOffice.readonly.notify_read') : t('home.liveOffice.readonly.notify_unread')} · ${n.title || n.body || t('home.liveOffice.readonly.notify_fallback')}`,
            )
            : [t('home.liveOffice.readonly.notify_empty')],
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
                `${c.name || t('home.liveOffice.readonly.conn_unnamed')} · ${c.connector_type || '—'} · ${c.status || t('home.liveOffice.readonly.conn_unknown')}`,
            )
            : [
              cap === 'notify_im'
                ? t('home.liveOffice.readonly.im_empty')
                : t('home.liveOffice.readonly.erp_empty'),
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
          { label: t('home.liveOffice.readonly.kpi_pending'), value: String(dash.pending_approvals ?? 0), hint: realStats },
          { label: t('home.liveOffice.readonly.kpi_sessions'), value: String(dash.chat_sessions ?? 0), hint: realStats },
          { label: t('home.liveOffice.readonly.kpi_kb'), value: String(kb.knowledge_bases ?? 0), hint: realStats },
          { label: t('home.liveOffice.readonly.kpi_docs'), value: String(kb.documents ?? 0), hint: realStats },
        ])
        setLines([t('home.liveOffice.readonly.dashboard_hint')])
      } else if (cap === 'data_nl_query') {
        setLines([t('home.liveOffice.readonly.nl_hint')])
      } else {
        setLines([t('home.liveOffice.readonly.unsupported', { cap })])
      }
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }, [cap, token, t, realStats])

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
      setNlMsg(data.answer || data.summary || data.error || t('home.liveOffice.readonly.nl_empty'))
      setNlReset((k) => k + 1)
      setNlVals({})
    } catch (e) {
      setNlMsg(t('home.liveOffice.readonly.nl_fail', { err: String(e) }))
    } finally {
      setNlBusy(false)
    }
  }

  return (
    <div className="irp-stack">
      <p className="irp-summary">
        {t('home.liveOffice.readonly.banner', { cap })}
      </p>
      {loading ? <p className="irp-summary">{t('common.loading')}</p> : null}
      {err ? <p className="irp-summary">{t('home.liveOffice.load_error', { err })}</p> : null}
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
        {lines.map((line) => (
          <p key={line} className="irp-summary">
            {line}
          </p>
        ))}
      </section>
      {cap === 'data_nl_query' ? (
        <section className="irp-panel irp-gtgt-panel">
          <GtgtStepComposer
            title={t('home.liveOffice.readonly.nl')}
            accent="#6366f1"
            variant="soft"
            flowHint={t('home.liveOffice.readonly.flow_hint')}
            steps={nlSteps}
            values={nlVals}
            onChange={(k, v) => setNlVals((p) => ({ ...p, [k]: v }))}
            onComplete={() => void runNl()}
            busy={nlBusy}
            resetKey={nlReset}
            submitLabel={t('home.liveOffice.readonly.query')}
          >
            {nlMsg ? <p className="irp-summary" style={{ marginTop: 10 }}>{nlMsg}</p> : null}
          </GtgtStepComposer>
        </section>
      ) : null}
    </div>
  )
}
