import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

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
  const [roomType, setRoomType] = useState('大床房')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guestName, setGuestName] = useState('')
  const [msg, setMsg] = useState('')

  const accent = primaryColor || '#b45309'

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
    if (!token || !roomType || !checkIn.trim() || !checkOut.trim()) {
      setMsg('请选择房型并填写入住/退房日期')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/hotel-booking/records', token, {
        method: 'POST',
        body: JSON.stringify({
          guest_name: (guestName || user?.display_name || '散客').trim(),
          room_type: roomType,
          check_in: checkIn.trim(),
          check_out: checkOut.trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setGuestName('')
      setCheckIn('')
      setCheckOut('')
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
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>选择房型</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(100px, 1fr))', gap: 8, marginBottom: 12 }}>
        {ROOMS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={roomType === r.key ? 'btn' : 'btn btn-ghost'}
            style={{
              textAlign: 'left',
              padding: 12,
              background: roomType === r.key ? accent : undefined,
              color: roomType === r.key ? '#fff' : undefined,
            }}
            onClick={() => setRoomType(r.key)}
          >
            <div style={{ fontWeight: 600 }}>{r.key}</div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>{r.desc}</div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 12 }}>
          <span className="muted">入住</span>
          <input
            className="input"
            style={{ width: '100%', marginTop: 4 }}
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          <span className="muted">退房</span>
          <input
            className="input"
            style={{ width: '100%', marginTop: 4 }}
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          className="input"
          style={{ flex: '1 1 160px' }}
          placeholder={`入住人（默认 ${user?.display_name || '散客'}）`}
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>
          确认预订 · {roomType}
        </button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待入住</h4>
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
  )
}
