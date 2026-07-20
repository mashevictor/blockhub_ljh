import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormFieldDef, SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, resolveFormSteps, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  status: string
  title: string
  channel: string
  metric: string
  [key: string]: string | undefined
}

const TRACK = ['open', 'running', 'closed'] as const
const LABEL: Record<string, string> = { open: '筹备', running: '进行中', closed: '已关闭' }

export function CampaignOpsWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const formHeadline = String(node.props?.form_headline || '会销活动')
  const defaultCat = String(node.props?.default_category || 'plan')
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#db2777'

  const steps: GtgtStep[] = useMemo(() => {
    const defaults: FormFieldDef[] = [
      { key: 'title', label: '活动名称', placeholder: '会销 / 路演名称' },
      { key: 'channel', label: '渠道', placeholder: '线下 / 线上', optional: true },
      { key: 'metric', label: '目标指标', placeholder: '到场人数 / 线索数', optional: true },
    ]
    return resolveFormSteps({
      defaults,
      formFields: node.props?.form_fields,
      pageMockFields: (node.props?.page_mock as { fields?: unknown } | undefined)?.fields,
    })
  }, [node.props?.form_fields, node.props?.page_mock])

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/campaign-ops/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token || !values.title?.trim()) {
      setMsg('请填写必填项')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/campaign-ops/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: defaultCat || 'plan',
          title: values.title.trim(),
          channel: (values.channel || '').trim(),
          metric: (values.metric || '').trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已创建')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/campaign-ops/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== TRACK[TRACK.length - 1])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title={formHeadline}
          meta="Gtgt · Soft · 真库"
          accent={accent}
          variant="soft"
          flowHint=">> 单字段推进 → 提交真库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="添加"
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>进度</h4>
          {loading && <p className="muted">加载中…</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {active.map((t) => {
              const idx = TRACK.indexOf(t.status as (typeof TRACK)[number])
              return (
                <li key={t.id} className="list-card">
                  <div className="list-card-head">
                    <strong>{t.title}</strong>
                    <span className="tag">{LABEL[t.status] || t.status}</span>
                  </div>
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    {t.channel}
                  </p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {TRACK.map((s, i) => (
                      <div
                        key={s}
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: i <= idx ? accent : 'rgba(0,0,0,0.12)',
                        }}
                      />
                    ))}
                  </div>
                  {t.status === 'open' && (
                    <button
                      type="button"
                      className="btn"
                      style={{ background: accent, marginTop: 8 }}
                      onClick={() => void advance(t.id, 'running')}
                    >
                      上线活动
                    </button>
                  )}
                  {t.status === 'running' && (
                    <button
                      type="button"
                      className="btn"
                      style={{ background: accent, marginTop: 8 }}
                      onClick={() => void advance(t.id, 'closed')}
                    >
                      关闭
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
