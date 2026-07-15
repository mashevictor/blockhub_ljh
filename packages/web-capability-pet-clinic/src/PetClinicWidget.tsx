import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  pet_name: string
  symptom: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'consult', l: '问诊' },
  { k: 'visit', l: '就诊' },
  { k: 'vaccine', l: '疫苗' },
]

export function PetClinicWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('consult')
  const [pet, setPet] = useState('')
  const [symptom, setSymptom] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#ea580c'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/pet-clinic/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !pet.trim() || !symptom.trim()) { setMsg('请填写宠物名与症状'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/pet-clinic/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category, pet_name: pet.trim(), symptom: symptom.trim(),
          schedule_at: when.trim(), note: '', app_public_id: appId || '',
        }),
      })
      setPet(''); setSymptom(''); setWhen(''); setMsg('已预约')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/pet-clinic/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== 'done')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>宠物就诊预约</h4>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {CATS.map((c) => (
          <button key={c.k} type="button" className={category === c.k ? 'btn' : 'btn btn-ghost'} style={category === c.k ? { background: accent } : undefined} onClick={() => setCategory(c.k)}>{c.l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="宠物名" value={pet} onChange={(e) => setPet(e.target.value)} />
        <input className="input" placeholder="症状 / 诉求" value={symptom} onChange={(e) => setSymptom(e.target.value)} />
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>预约</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {active.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.pet_name} · {t.symptom}</strong>
              <span className="tag">{t.status === 'open' ? '待约' : t.status === 'scheduled' ? '已预约' : t.status}</span>
            </div>
            {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
            <div className="row-actions" style={{ marginTop: 8 }}>
              {t.status === 'open' && <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'scheduled')}>确认预约</button>}
              {t.status !== 'done' && <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>完成就诊</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
