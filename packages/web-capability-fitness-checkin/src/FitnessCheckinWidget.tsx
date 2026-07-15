import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  member_name: string
  class_name: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'book', l: '预约课' },
  { k: 'checkin', l: '到店打卡' },
  { k: 'coach', l: '私教' },
]

export function FitnessCheckinWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('checkin')
  const [className, setClassName] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#16a34a'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/fitness-checkin/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !className.trim()) { setMsg('请填写课程名'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/fitness-checkin/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category, member_name: user?.display_name || '', class_name: className.trim(),
          schedule_at: when.trim(), note: '', app_public_id: appId || '',
        }),
      })
      setClassName(''); setWhen(''); setMsg(category === 'checkin' ? '打卡成功' : '已预约')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const done = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/fitness-checkin/records/${id}/done`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>健身预约 / 打卡</h4>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {CATS.map((c) => (
          <button key={c.k} type="button" className={category === c.k ? 'btn' : 'btn btn-ghost'} style={category === c.k ? { background: accent } : undefined} onClick={() => setCategory(c.k)}>{c.l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="课程名" value={className} onChange={(e) => setClassName(e.target.value)} />
        {category !== 'checkin' && <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>{category === 'checkin' ? '立即打卡' : '预约课程'}</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.class_name}</strong>
              <span className="tag">{t.member_name || '会员'}</span>
            </div>
            {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void done(t.id)}>完成</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
