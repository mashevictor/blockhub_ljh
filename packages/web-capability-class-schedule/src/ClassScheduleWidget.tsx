import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  schedule_date: string
  time_slot: string
  location: string
  category: string
  status: string
}

const SLOTS = ['08:00-09:40', '10:00-11:40', '14:00-15:40', '16:00-17:40', '19:00-20:40']

export function ClassScheduleWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ time_slot: SLOTS[0] })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#4f46e5'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'title',
        label: '课程 / 考试名称',
        placeholder: '例：英语 Unit4 / 期中数学考试',
        hint: '课程、考试、补课都可以登记；名称写清楚方便日后查询。',
      },
      {
        key: 'schedule_date',
        label: '上课日期',
        inputType: 'date',
        placeholder: '点选日期',
        hint: '用日期控件点选，避免手打格式错误。',
      },
      {
        key: 'time_slot',
        label: '时段',
        hint: '点选常用课时；没有合适的可先选接近时段，再在教室里备注。',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions" style={{ flexWrap: 'wrap' }}>
            {SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                className={(value || SLOTS[0]) === s ? 'btn' : 'btn btn-ghost'}
                style={(value || SLOTS[0]) === s ? { background: a, fontSize: 11 } : { fontSize: 11 }}
                onClick={() => setValue(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'location',
        label: '教室（可空）',
        optional: true,
        placeholder: '例：教学楼 A301 / 线上腾讯会议',
        hint: '可空；有教室或线上链接时填上，方便提醒。',
      },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/class-schedule/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token || !values.title?.trim()) {
      setMsg('请填写课程名')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/class-schedule/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(),
          schedule_date: (values.schedule_date || '').trim(),
          time_slot: (values.time_slot || SLOTS[0]).trim(),
          location: (values.location || '').trim(),
          category: 'course',
          app_public_id: appId || '',
        }),
      })
      setValues({ time_slot: SLOTS[0] })
      setResetKey((k) => k + 1)
      setMsg('已排入课表（真库）')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const archive = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/class-schedule/records/${id}/archive`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const live = items.filter((t) => t.status === 'published')

  return (
    <div>
      <GtgtStepComposer
        title="排课 / 考试登记"
        meta="课表 · Soft 步进"
        accent={accent}
        variant="soft"
        flowHint="课程名 → 日期 → 时段 → 教室（可跳过）→ 写入真库"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={resetKey}
        submitLabel="加入课表"
      />
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>本周课表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && live.length === 0 && <p className="muted">空库无课表 — 上方登记后会出现在这里</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {live.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.title}</strong>
              <span className="tag">{t.time_slot || '时段待定'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {[t.schedule_date, t.location].filter(Boolean).join(' · ')}
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8, fontSize: 12 }}
              onClick={() => void archive(t.id)}
            >
              归档
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
