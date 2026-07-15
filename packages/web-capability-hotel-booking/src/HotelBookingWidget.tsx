import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  guest_name: string
  room_type: string
  check_in: string
  check_out: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  booked: '已预订',
  checked_in: '已入住',
  cancelled: '已取消',
}

export function HotelBookingWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#b45309'
  const booked = items.filter((t) => t.status === 'booked').length

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'guest_name', label: '客人姓名', placeholder: '张三', optional: true },
      { key: 'room_type', label: '房型', placeholder: '大床房 / 双床房 / 套房' },
      { key: 'check_in', label: '入住日期', placeholder: '2026-03-15' },
      { key: 'check_out', label: '退房日期', placeholder: '2026-03-17' },
      { key: 'note', label: '备注', placeholder: '无烟房、靠窗…', optional: true },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/hotel-booking/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token || !values.room_type?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/hotel-booking/records', token, {
        method: 'POST',
        body: JSON.stringify({
          guest_name: (values.guest_name || '散客').trim(),
          room_type: values.room_type.trim(),
          check_in: (values.check_in || '').trim(),
          check_out: (values.check_out || '').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('预订已提交')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const checkIn = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/hotel-booking/records/${id}/check-in`, token, { method: 'POST', body: '{}' })
      setMsg('已办理入住')
      await load()
    } catch (e) {
      setMsg(`入住失败：${String(e)}`)
    }
  }

  const cancel = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/hotel-booking/records/${id}/cancel`, token, { method: 'POST', body: '{}' })
      setMsg('已取消预订')
      await load()
    } catch (e) {
      setMsg(`取消失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建预订</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '客房预订' : '酒店预订'}
          meta={entrySource === 'im' ? '群入口' : '前台工作台'}
          accent={accent}
          flowHint={`客人 → 房型 → 入住 → 退房${user?.display_name ? ` · ${user.display_name}` : ''}${booked ? ` · 待入住 ${booked}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交预订"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>预订列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.guest_name}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {t.room_type} · {t.check_in || '—'} → {t.check_out || '—'}
            </p>
            {t.note && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.note}</p>}
            {t.status === 'booked' && (
              <div className="row-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void checkIn(t.id)}>入住</button>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void cancel(t.id)}>取消</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
