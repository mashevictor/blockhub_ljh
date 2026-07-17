import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  content: string
  audience: string
  category: string
  status: string
}

const AUDIENCE = ['全体家长', '本班家长', '老师']

export function SchoolNoticeWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ audience: AUDIENCE[0] })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#2563eb'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'title', label: '通知标题', placeholder: '通知标题' },
      { key: 'content', label: '通知内容', placeholder: '通知内容', inputType: 'textarea', optional: true },
      {
        key: 'audience',
        label: '发送对象',
        render: ({ value, setValue, accent: accentColor }) => (
          <div className="row-actions">
            {AUDIENCE.map((aud) => (
              <button
                key={aud}
                type="button"
                className={(value || AUDIENCE[0]) === aud ? 'btn' : 'btn btn-ghost'}
                style={(value || AUDIENCE[0]) === aud ? { background: accentColor, fontSize: 12 } : { fontSize: 12 }}
                onClick={() => setValue(aud)}
              >
                {aud}
              </button>
            ))}
          </div>
        ),
      },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/school-notice/records${q}`, token)
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

  const publish = async () => {
    if (!token || !values.title?.trim()) {
      setMsg('请填写通知标题')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/school-notice/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(),
          content: (values.content || '').trim(),
          audience: values.audience || AUDIENCE[0],
          category: 'notice',
          app_public_id: appId || '',
        }),
      })
      setValues({ audience: AUDIENCE[0] })
      setResetKey((k) => k + 1)
      setMsg('已发布')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const ack = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/school-notice/records/${id}/ack`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const published = items.filter((t) => t.status === 'published')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="发布家校通知"
          meta="Gtgt · Soft · 真库"
          accent={accent}
          variant="soft"
          flowHint=">> 单字段推进 → 提交真库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={publish}
          busy={busy}
          resetKey={resetKey}
          submitLabel="发布"
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            待回执{published.length ? ` · ${published.length}` : ''}
          </h4>
          {loading && <p className="muted">加载中…</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {published.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>{t.title}</strong>
                  <span className="tag">{t.audience || '全员'}</span>
                </div>
                {t.content ? <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.content}</p> : null}
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void ack(t.id)}>
                  我已知晓
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
