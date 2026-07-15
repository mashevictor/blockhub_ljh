import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  status: string
    destination: string
  days: string
  title: string
  [key: string]: string | undefined
}

const TRACK = ['open', 'confirmed', 'done'] as const
const LABEL: Record<string, string> = {'open': '草稿', 'confirmed': '已确认', 'done': '已出行'}

export function TravelPlanWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0891b2'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/travel-plan/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !(values.destination || '').trim()) { setMsg('请填写必填项'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/travel-plan/records', token, {
        method: 'POST',
        body: JSON.stringify({ category: 'trip', destination: (values.destination || '').trim(), days: (values.days || '').trim(), title: (values.title || '').trim() || (values.destination || '').trim(), note: '', app_public_id: appId || '' }),
      })
      setValues({}); setMsg('已创建')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/travel-plan/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== TRACK[TRACK.length - 1])

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>旅行规划</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="目的地" value={values.destination || ''} onChange={(e) => setValues((p) => ({ ...p, destination: e.target.value }))} />
        <input className="input" placeholder="天数" value={values.days || ''} onChange={(e) => setValues((p) => ({ ...p, days: e.target.value }))} />
        <input className="input" placeholder="行程标题" value={values.title || ''} onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>添加</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>进度</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {active.map((t) => {
          const idx = TRACK.indexOf(t.status as typeof TRACK[number])
          return (
            <li key={t.id} className="list-card">
              <div className="list-card-head">
                <strong>{t.destination}</strong>
                <span className="tag">{LABEL[t.status] || t.status}</span>
              </div>
              <p className="muted" style={{ margin: '6px 0 0' }}>{t.title}</p>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {TRACK.map((s, i) => (
                  <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? accent : 'rgba(0,0,0,0.12)' }} />
                ))}
              </div>
              {t.status === 'open' && (
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void advance(t.id, 'confirmed')}>确认行程</button>
              )}
              {t.status === 'confirmed' && (
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void advance(t.id, 'done')}>出行完成</button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
