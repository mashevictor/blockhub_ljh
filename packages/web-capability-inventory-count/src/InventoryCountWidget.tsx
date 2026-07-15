import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  location: string
  sku_code: string
  qty: string
  note: string
  status: string
}

export function InventoryCountWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [location, setLocation] = useState('')
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0369a1'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/inventory-count/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !sku.trim()) { setMsg('请填写 SKU'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/inventory-count/records', token, {
        method: 'POST',
        body: JSON.stringify({
          location: location.trim() || '默认货位',
          sku_code: sku.trim(),
          qty: qty.trim() || '0',
          note: '',
          app_public_id: appId || '',
        }),
      })
      setSku(''); setQty(''); setMsg('已录入盘点行')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const confirm = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/inventory-count/records/${id}/confirm`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const pending = items.filter((t) => t.status === 'pending')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>扫码盘点</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="货位（可空）" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" placeholder="SKU / 条码" value={sku} onChange={(e) => setSku(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} />
        <input className="input" placeholder="实盘数量" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>录入本行</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待确认入库{pending.length ? ` · ${pending.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {pending.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.sku_code}</strong>
              <span className="tag">×{t.qty}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.location}</p>
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void confirm(t.id)}>确认入库</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
