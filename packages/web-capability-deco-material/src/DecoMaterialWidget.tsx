import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  status: string
    material_name: string
  location: string
  budget: string
  [key: string]: string | undefined
}

const TRACK = ['open', 'accepted', 'done'] as const
const LABEL: Record<string, string> = {'open': '待选', 'accepted': '已验收', 'done': '完成'}

export function DecoMaterialWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#ca8a04'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/deco-material/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !(values.material_name || '').trim()) { setMsg('请填写必填项'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/deco-material/records', token, {
        method: 'POST',
        body: JSON.stringify({ category: 'material', material_name: (values.material_name || '').trim(), location: (values.location || '').trim(), budget: (values.budget || '').trim(), note: '', app_public_id: appId || '' }),
      })
      setValues({}); setMsg('已创建')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/deco-material/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== TRACK[TRACK.length - 1])

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>装修选材</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="材料名称" value={values.material_name || ''} onChange={(e) => setValues((p) => ({ ...p, material_name: e.target.value }))} />
        <input className="input" placeholder="使用位置" value={values.location || ''} onChange={(e) => setValues((p) => ({ ...p, location: e.target.value }))} />
        <input className="input" placeholder="预算" value={values.budget || ''} onChange={(e) => setValues((p) => ({ ...p, budget: e.target.value }))} />
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
                <strong>{t.material_name}</strong>
                <span className="tag">{LABEL[t.status] || t.status}</span>
              </div>
              <p className="muted" style={{ margin: '6px 0 0' }}>{t.location}</p>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {TRACK.map((s, i) => (
                  <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? accent : 'rgba(0,0,0,0.12)' }} />
                ))}
              </div>
              {t.status === 'open' && (
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void advance(t.id, 'accepted')}>验收通过</button>
              )}
              {t.status === 'accepted' && (
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void advance(t.id, 'done')}>完成</button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
