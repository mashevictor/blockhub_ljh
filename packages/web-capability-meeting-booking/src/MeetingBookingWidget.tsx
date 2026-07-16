import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  room_name: string
  title: string
  start_at: string
  end_at: string
  attendees: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
  done: '已结束',
}

export function MeetingBookingWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0891b2'
  const open = items.filter((t) => t.status === 'open' || t.status === 'confirmed')

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'room_name', label: '会议室', placeholder: '如：A栋 3F 大会议室' },
      { key: 'title', label: '会议主题', placeholder: '周会 / 项目评审…' },
      { key: 'start_at', label: '开始时间', placeholder: '2026-07-20 14:00' },
      { key: 'end_at', label: '结束时间', placeholder: '2026-07-20 15:00' },
      { key: 'attendees', label: '参会人（可空）', placeholder: '张三、李四', optional: true },
      { key: 'note', label: '备注（可空）', placeholder: '需要投屏 / 茶歇…', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/meeting-booking/records${q}`, token)
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
    if (!token || !values.room_name?.trim() || !values.title?.trim() || !values.start_at?.trim() || !values.end_at?.trim()) {
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/meeting-booking/records', token, {
        method: 'POST',
        body: JSON.stringify({
          room_name: values.room_name.trim(),
          title: values.title.trim(),
          start_at: values.start_at.trim(),
          end_at: values.end_at.trim(),
          attendees: (values.attendees || '').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已预约，写入数据库')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/meeting-booking/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="会议室预约"
          meta={user?.display_name || '预订人'}
          accent={accent}
          flowHint="选会议室 → 主题时段 → 写入数据库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交预约"
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>预约单 {open.length ? `· ${open.length}` : ''}</h4>
          {loading && <p className="muted">加载中…</p>}
          {!loading && open.length === 0 && <p className="muted">暂无预约，提交后写入数据库</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {open.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.room_name} · {t.title}
                  </strong>
                  <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                  {t.start_at} → {t.end_at}
                </p>
                {t.attendees ? <p className="muted" style={{ margin: '4px 0 0' }}>{t.attendees}</p> : null}
                <div className="row-actions" style={{ marginTop: 12 }}>
                  {t.status === 'open' && (
                    <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'confirmed')}>
                      确认
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'cancelled')}>
                    取消
                  </button>
                  {t.status === 'confirmed' && (
                    <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>
                      结束
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
