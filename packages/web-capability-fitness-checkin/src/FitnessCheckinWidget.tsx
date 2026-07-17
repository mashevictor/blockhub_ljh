import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  member_name: string
  class_name: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'book', l: '预约课' },
  { k: 'checkin', l: '到店打卡' },
  { k: 'coach', l: '私教' },
]

export function FitnessCheckinWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'checkin' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#16a34a'

  const category = values.category || 'checkin'

  const steps: GtgtStep[] = useMemo(() => {
    const base: GtgtStep[] = [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {CATS.map((c) => (
              <button
                key={c.k}
                type="button"
                className={(value || 'checkin') === c.k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'checkin') === c.k ? { background: a } : undefined}
                onClick={() => setValue(c.k)}
              >
                {c.l}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'class_name', label: '课程名', placeholder: '课程名' },
    ]
    if (category !== 'checkin') {
      base.push({ key: 'schedule_at', label: '预约时间', inputType: 'datetime-local', optional: true })
    }
    return base
  }, [category])

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/fitness-checkin/records${q}`, token)
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
    if (!token || !values.class_name?.trim()) {
      setMsg('请填写课程名')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/fitness-checkin/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: values.category || 'checkin',
          member_name: user?.display_name || '',
          class_name: values.class_name.trim(),
          schedule_at: (values.schedule_at || '').trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({ category: values.category || 'checkin' })
      setResetKey((k) => k + 1)
      setMsg(category === 'checkin' ? '打卡成功' : '已预约')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const done = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/fitness-checkin/records/${id}/done`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="健身预约 / 打卡"
          meta={user?.display_name || '会员'}
          accent={accent}
          variant="soft"
          flowHint=">> 单字段推进 → 提交真库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel={category === 'checkin' ? '立即打卡' : '预约课程'}
        />
        <div>
          {loading && <p className="muted">加载中…</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {open.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>{t.class_name}</strong>
                  <span className="tag">{t.member_name || '会员'}</span>
                </div>
                {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void done(t.id)}>
                  完成
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
