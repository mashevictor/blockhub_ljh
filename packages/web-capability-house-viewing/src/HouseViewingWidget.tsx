import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

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
  const [category, setCategory] = useState('viewing')
  const [client, setClient] = useState('')
  const [addr, setAddr] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#c2410c'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/house-viewing/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !client.trim() || !addr.trim()) { setMsg('请填写客户与房源地址'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/house-viewing/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category, client_name: client.trim(), property_addr: addr.trim(),
          schedule_at: when.trim(), note: '', app_public_id: appId || '',
        }),
      })
      setClient(''); setAddr(''); setWhen(''); setMsg('已预约')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/house-viewing/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== 'done')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>预约看房</h4>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {CATS.map((c) => (
          <button key={c.k} type="button" className={category === c.k ? 'btn' : 'btn btn-ghost'} style={category === c.k ? { background: accent } : undefined} onClick={() => setCategory(c.k)}>{c.l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="客户姓名" value={client} onChange={(e) => setClient(e.target.value)} />
        <input className="input" placeholder="房源地址" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>确认预约</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>日程</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {active.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.client_name} · {t.property_addr}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
            <div className="row-actions" style={{ marginTop: 8 }}>
              {t.status === 'open' && <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'following')}>开始跟进</button>}
              {t.status !== 'done' && <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>完成</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
