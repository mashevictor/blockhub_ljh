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

const ROOMS = [
  { key: '标准间', desc: '双床 · 适合差旅' },
  { key: '大床房', desc: '1.8m 床 · 商务常选' },
  { key: '套房', desc: '客厅+卧室 · 会客' },
] as const

const STATUS_LABEL: Record<string, string> = {
  booked: '已预订',
  checked_in: '已入住',
  cancelled: '已取消',
}

export function HotelBookingWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ room_type: '大床房' })
  const [msg, setMsg] = useState('')

  const accent = primaryColor || '#b45309'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'room_type',
        label: '选择房型',
        render: ({ value, setValue, accent: a }) => (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(80px, 1fr))', gap: 8 }}>
            {ROOMS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={(value || '大床房') === r.key ? 'btn' : 'btn btn-ghost'}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  background: (value || '大床房') === r.key ? a : undefined,
                  color: (value || '大床房') === r.key ? '#fff' : undefined,
                }}
                onClick={() => setValue(r.key)}
              >
                <div style={{ fontWeight: 600 }}>{r.key}</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        ),
      },
      { key: 'check_in', label: '入住日期', inputType: 'date' },
      { key: 'check_out', label: '退房日期', inputType: 'date' },
      {
        key: 'guest_name',
        label: '入住人',
        placeholder: `默认 ${user?.display_name || '散客'}`,
        optional: true,
      },
    ],
    [user?.display_name],
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
    if (!token || !values.room_type || !values.check_in?.trim() || !values.check_out?.trim()) {
      setMsg('请选择房型并填写入住/退房日期')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/hotel-booking/records', token, {
        method: 'POST',
        body: JSON.stringify({
          guest_name: (values.guest_name || user?.display_name || '散客').trim(),
          room_type: values.room_type,
          check_in: values.check_in.trim(),
          check_out: values.check_out.trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({ room_type: '大床房' })
      setResetKey((k) => k + 1)
      setMsg('预订成功')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const checkInAction = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/hotel-booking/records/${id}/check-in`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`办理失败：${String(e)}`)
    }
  }

  const cancel = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/hotel-booking/records/${id}/cancel`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`取消失败：${String(e)}`)
    }
  }

  const active = items.filter((t) => t.status === 'booked')
  const others = items.filter((t) => t.status !== 'booked')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="酒店预订"
          meta={user?.display_name || '散客'}
          accent={accent}
          variant="soft"
          flowHint=">> 单字段推进 → 提交真库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel={`确认预订 · ${values.room_type || '大床房'}`}
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>待入住</h4>
          {loading && <p className="muted">加载中…</p>}
          {!loading && active.length === 0 && <p className="muted">暂无预订</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {active.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.room_type} · {t.guest_name}
                  </strong>
                  <span className="tag">{STATUS_LABEL[t.status]}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                  {t.check_in} → {t.check_out}
                </p>
                <div className="row-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="btn" style={{ background: accent }} onClick={() => void checkInAction(t.id)}>
                    办理入住
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => void cancel(t.id)}>
                    取消
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {others.length > 0 && (
            <>
              <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>历史</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {others.map((t) => (
                  <li key={t.id} className="list-card" style={{ opacity: 0.85 }}>
                    <div className="list-card-head">
                      <strong>
                        {t.room_type} · {t.guest_name}
                      </strong>
                      <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
                    </div>
                    <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                      {t.check_in} → {t.check_out}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
