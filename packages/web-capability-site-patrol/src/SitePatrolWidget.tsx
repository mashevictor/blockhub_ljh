import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  site_name: string
  checkpoint: string
  result: string
  note: string
  status: string
}

const POINTS = ['大门', '电梯厅', '消防通道', '配电间', '楼顶', '地下室']

export function SitePatrolWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [checkpoint, setCheckpoint] = useState(POINTS[0])
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#15803d'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/site-patrol/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const punch = async (result: 'ok' | 'issue') => {
    if (!token || !siteName.trim()) { setMsg('请先填写巡逻站点'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/site-patrol/records', token, {
        method: 'POST',
        body: JSON.stringify({
          site_name: siteName.trim(), checkpoint, result,
          note: result === 'issue' ? '发现隐患，待跟进' : '',
          app_public_id: appId || '',
        }),
      })
      setMsg(result === 'ok' ? '已打卡：合格' : '已记录隐患')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const close = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/site-patrol/records/${id}/close`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>巡检打卡</h4>
      <input className="input" style={{ width: '100%', marginBottom: 8 }} placeholder="站点名称，如：A区物业" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
      <p className="muted" style={{ fontSize: 12, margin: '0 0 6px' }}>打卡点</p>
      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {POINTS.map((p) => (
          <button key={p} type="button" className={checkpoint === p ? 'btn' : 'btn btn-ghost'} style={checkpoint === p ? { background: accent, fontSize: 12 } : { fontSize: 12 }} onClick={() => setCheckpoint(p)}>{p}</button>
        ))}
      </div>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void punch('ok')}>合格打卡</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void punch('issue')}>发现隐患</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待结案{open.length ? ` · ${open.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.site_name} · {t.checkpoint}</strong>
              <span className="tag">{t.result === 'ok' ? '合格' : '隐患'}</span>
            </div>
            {t.note ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.note}</p> : null}
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void close(t.id)}>结案</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
