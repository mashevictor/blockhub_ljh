import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  status: string
    title: string
  party: string
  deadline: string
  [key: string]: string | undefined
}

const TRACK = ['open', 'reviewing', 'done'] as const
const LABEL: Record<string, string> = {'open': '待审', 'reviewing': '审查中', 'done': '办结'}

export function LegalCaseWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#7c3aed'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/legal-case/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !(values.title || '').trim()) { setMsg('请填写必填项'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/legal-case/records', token, {
        method: 'POST',
        body: JSON.stringify({ category: 'contract', title: (values.title || '').trim(), party: (values.party || '').trim(), deadline: (values.deadline || '').trim(), note: '', app_public_id: appId || '' }),
      })
      setValues({}); setMsg('已创建')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/legal-case/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== TRACK[TRACK.length - 1])

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>法务案件</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="案件/合同标题" value={values.title || ''} onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))} />
        <input className="input" placeholder="当事人" value={values.party || ''} onChange={(e) => setValues((p) => ({ ...p, party: e.target.value }))} />
        <input className="input" placeholder="节点日期" value={values.deadline || ''} onChange={(e) => setValues((p) => ({ ...p, deadline: e.target.value }))} />
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
                <strong>{t.title}</strong>
                <span className="tag">{LABEL[t.status] || t.status}</span>
              </div>
              <p className="muted" style={{ margin: '6px 0 0' }}>{t.party}</p>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {TRACK.map((s, i) => (
                  <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? accent : 'rgba(0,0,0,0.12)' }} />
                ))}
              </div>
              {t.status === 'open' && (
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void advance(t.id, 'reviewing')}>开始审查</button>
              )}
              {t.status === 'reviewing' && (
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void advance(t.id, 'done')}>办结</button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
