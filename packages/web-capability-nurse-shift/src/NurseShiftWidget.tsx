import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  nurse_name: string
  shift_date: string
  from_shift: string
  to_shift: string
  reason: string
  status: string
  reporter_name?: string
}

const SHIFTS = ['白班', '小夜', '大夜']

export function NurseShiftWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ from_shift: '白班', to_shift: '小夜' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#be185d'

  const steps: GtgtStep[] = useMemo(() => [
    { key: 'shift_date', label: '调班日期', placeholder: '2026-07-20' },
    {
      key: 'from_shift', label: '原班次',
      render: ({ value, setValue, accent: a }) => (
        <div className="row-actions">{SHIFTS.map((s) => (
          <button key={s} type="button" className={(value || '白班') === s ? 'btn' : 'btn btn-ghost'} style={(value || '白班') === s ? { background: a } : undefined} onClick={() => setValue(s)}>{s}</button>
        ))}</div>
      ),
    },
    {
      key: 'to_shift', label: '目标班次',
      render: ({ value, setValue, accent: a }) => (
        <div className="row-actions">{SHIFTS.map((s) => (
          <button key={s} type="button" className={(value || '小夜') === s ? 'btn' : 'btn btn-ghost'} style={(value || '小夜') === s ? { background: a } : undefined} onClick={() => setValue(s)}>{s}</button>
        ))}</div>
      ),
    },
    { key: 'reason', label: '事由（可空）', optional: true, placeholder: '家事 / 培训…' },
  ], [])

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/nurse-shift/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !values.shift_date?.trim()) return
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/nurse-shift/records', token, {
        method: 'POST',
        body: JSON.stringify({
          nurse_name: user?.display_name || '',
          shift_date: values.shift_date.trim(),
          from_shift: values.from_shift || '白班',
          to_shift: values.to_shift || '小夜',
          reason: (values.reason || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ from_shift: '白班', to_shift: '小夜' }); setResetKey((k) => k + 1); setMsg('已提交调班')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/nurse-shift/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const pending = items.filter((t) => t.status === 'pending')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) minmax(260px,1fr)', gap: 16 }}>
      <GtgtStepComposer title="我要调班" meta={user?.display_name || '护士'} accent={accent} flowHint="日期 → 原班 → 目标班 → 审批" steps={steps} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} onComplete={submit} busy={busy} resetKey={resetKey} submitLabel="提交调班" />
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>待审批{pending.length ? ` · ${pending.length}` : ''}</h4>
        {loading && <p className="muted">加载中…</p>}
        {msg && <p className="status-msg">{msg}</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {pending.map((t) => (
            <li key={t.id} className="list-card">
              <strong>{t.nurse_name || t.reporter_name || '同事'} · {t.shift_date}</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.from_shift} → {t.to_shift}</p>
              <div className="row-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'approve')}>通过</button>
                <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'reject')}>驳回</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
