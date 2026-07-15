import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  candidate: string
  stage: string
  owner: string
  note: string
  status: string
}

const COLUMNS = [
  { key: 'open', label: '候选人' },
  { key: 'interview', label: '面试', action: 'interview' },
  { key: 'offered', label: 'Offer', action: 'offered' },
  { key: 'joined', label: '已入职', action: 'joined' },
] as const

export function HireOnboardWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [candidate, setCandidate] = useState('')
  const [stage, setStage] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#a855f7'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/hire-onboard/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !candidate.trim()) return
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/hire-onboard/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'job', candidate: candidate.trim(), stage: stage.trim() || '初筛',
          owner: user?.display_name || '', note: '', app_public_id: appId || '',
        }),
      })
      setCandidate(''); setStage(''); setMsg('已加入招聘板')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const moveTo = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/hire-onboard/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  return (
    <div>
      <div className="list-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input className="input" style={{ flex: '1 1 140px' }} placeholder="候选人 / 岗位" value={candidate} onChange={(e) => setCandidate(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} />
        <input className="input" style={{ flex: '0 1 100px' }} placeholder="阶段" value={stage} onChange={(e) => setStage(e.target.value)} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy || !candidate.trim()} onClick={() => void submit()}>录入</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))', gap: 8, overflowX: 'auto' }}>
        {COLUMNS.map((col) => {
          const colItems = items.filter((t) => t.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: col.key === 'open' ? accent : 'rgba(0,0,0,0.06)', color: col.key === 'open' ? '#fff' : 'inherit' }}>{col.label} · {colItems.length}</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {colItems.map((t) => (
                  <li key={t.id} className="list-card" style={{ padding: 10 }}>
                    <strong style={{ fontSize: 13 }}>{t.candidate}</strong>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>{t.stage || '—'}{t.owner ? ` · ${t.owner}` : ''}</p>
                    <div className="row-actions" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {COLUMNS.filter((c) => 'action' in c && c.action && c.key !== t.status).map((c) => (
                        <button key={c.key} type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => void moveTo(t.id, (c as { action: string }).action)}>→{c.label}</button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
