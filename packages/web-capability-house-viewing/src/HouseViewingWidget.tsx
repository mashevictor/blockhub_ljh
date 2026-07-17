import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  client_name: string
  property_addr: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'viewing', l: '约看' },
  { k: 'intent', l: '意向' },
  { k: 'sign', l: '签约' },
]

const STATUS_LABEL: Record<string, string> = {
  open: '待看房',
  following: '跟进中',
  done: '已完成',
}

export function HouseViewingWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'viewing' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#c2410c'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {CATS.map((c) => (
              <button
                key={c.k}
                type="button"
                className={(value || 'viewing') === c.k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'viewing') === c.k ? { background: a } : undefined}
                onClick={() => setValue(c.k)}
              >
                {c.l}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'client_name', label: '客户姓名', placeholder: '客户姓名' },
      { key: 'property_addr', label: '房源地址', placeholder: '房源地址' },
      { key: 'schedule_at', label: '预约时间', inputType: 'datetime-local', optional: true },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/house-viewing/records${q}`, token)
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
    if (!token || !values.client_name?.trim() || !values.property_addr?.trim()) {
      setMsg('请填写客户与房源地址')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/house-viewing/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: values.category || 'viewing',
          client_name: values.client_name.trim(),
          property_addr: values.property_addr.trim(),
          schedule_at: (values.schedule_at || '').trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'viewing' })
      setResetKey((k) => k + 1)
      setMsg('已预约')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/house-viewing/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== 'done')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="预约看房"
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
          submitLabel="确认预约"
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>日程</h4>
          {loading && <p className="muted">加载中…</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {active.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.client_name} · {t.property_addr}
                  </strong>
                  <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
                </div>
                {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
                <div className="row-actions" style={{ marginTop: 8 }}>
                  {t.status === 'open' && (
                    <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'following')}>
                      开始跟进
                    </button>
                  )}
                  {t.status !== 'done' && (
                    <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>
                      完成
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
