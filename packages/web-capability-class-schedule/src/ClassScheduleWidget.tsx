import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  schedule_date: string
  time_slot: string
  location: string
  category: string
  status: string
}

const SLOTS = ['08:00-09:40', '10:00-11:40', '14:00-15:40', '16:00-17:40', '19:00-20:40']

export function ClassScheduleWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState(SLOTS[0])
  const [location, setLocation] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#4f46e5'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/class-schedule/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !title.trim()) { setMsg('请填写课程名'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/class-schedule/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), schedule_date: date.trim(), time_slot: slot,
          location: location.trim(), category: 'course', app_public_id: appId || '',
        }),
      })
      setTitle(''); setMsg('已排入课表')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const archive = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/class-schedule/records/${id}/archive`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const live = items.filter((t) => t.status === 'published')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>排课</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
        <input className="input" placeholder="课程 / 考试名称" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input" placeholder="教室（可空）" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
        {SLOTS.map((s) => (
          <button key={s} type="button" className={slot === s ? 'btn' : 'btn btn-ghost'} style={slot === s ? { background: accent, fontSize: 11 } : { fontSize: 11 }} onClick={() => setSlot(s)}>{s}</button>
        ))}
      </div>
      <button type="button" className="btn" style={{ background: accent, marginBottom: 12 }} disabled={busy} onClick={() => void submit()}>加入课表</button>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>本周课表</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {live.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.title}</strong>
              <span className="tag">{t.time_slot || '时段待定'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{[t.schedule_date, t.location].filter(Boolean).join(' · ')}</p>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void archive(t.id)}>归档</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
