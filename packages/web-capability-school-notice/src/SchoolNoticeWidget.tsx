import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

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
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [audience, setAudience] = useState(AUDIENCE[0])
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#2563eb'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/school-notice/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const publish = async () => {
    if (!token || !title.trim()) { setMsg('请填写通知标题'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/school-notice/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), content: content.trim(), audience,
          category: 'notice', app_public_id: appId || '',
        }),
      })
      setTitle(''); setContent(''); setMsg('已发布')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const ack = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/school-notice/records/${id}/ack`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const published = items.filter((t) => t.status === 'published')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>发布家校通知</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
        <input className="input" placeholder="通知标题" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={3} placeholder="通知内容" value={content} onChange={(e) => setContent(e.target.value)} style={{ resize: 'vertical' }} />
      </div>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {AUDIENCE.map((a) => (
          <button key={a} type="button" className={audience === a ? 'btn' : 'btn btn-ghost'} style={audience === a ? { background: accent, fontSize: 12 } : { fontSize: 12 }} onClick={() => setAudience(a)}>{a}</button>
        ))}
      </div>
      <button type="button" className="btn" style={{ background: accent, marginBottom: 12 }} disabled={busy} onClick={() => void publish()}>发布</button>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待回执{published.length ? ` · ${published.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {published.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.title}</strong>
              <span className="tag">{t.audience || '全员'}</span>
            </div>
            {t.content ? <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.content}</p> : null}
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void ack(t.id)}>我已知晓</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
