import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  product_code: string
  process_name: string
  result: string
  note: string
  status: string
}

const PROCESSES = ['来料检', '工序检', '成品检', '出货检']

export function QualityInspectWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [product, setProduct] = useState('')
  const [processName, setProcessName] = useState(PROCESSES[0])
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#b45309'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/quality-inspect/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const judge = async (result: 'pass' | 'fail') => {
    if (!token || !product.trim()) { setMsg('请填写产品批号/编码'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/quality-inspect/records', token, {
        method: 'POST',
        body: JSON.stringify({
          product_code: product.trim(),
          process_name: processName,
          result,
          note: result === 'fail' ? '不合格，待复检' : '',
          app_public_id: appId || '',
        }),
      })
      setMsg(result === 'pass' ? '已判定合格' : '已判定不合格')
      setProduct('')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const close = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/quality-inspect/records/${id}/close`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>质检判定</h4>
      <input className="input" style={{ width: '100%', marginBottom: 8 }} placeholder="产品编码 / 批次号" value={product} onChange={(e) => setProduct(e.target.value)} />
      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {PROCESSES.map((p) => (
          <button key={p} type="button" className={processName === p ? 'btn' : 'btn btn-ghost'} style={processName === p ? { background: accent, fontSize: 12 } : { fontSize: 12 }} onClick={() => setProcessName(p)}>{p}</button>
        ))}
      </div>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void judge('pass')}>合格</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void judge('fail')}>不合格</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待闭环</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.product_code} · {t.process_name}</strong>
              <span className="tag">{t.result === 'pass' ? '合格' : '不合格'}</span>
            </div>
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void close(t.id)}>闭环归档</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
