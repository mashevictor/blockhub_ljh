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
  reporter_name?: string
}

const CAT_LABEL: Record<string, string> = { course: '课程', exam: '考试', classroom: '教室' }

export function ClassScheduleWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'course' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#7c3aed'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'course') === 'course' ? 'btn' : 'btn btn-ghost'} style={(value || 'course') === 'course' ? { background: a } : undefined} onClick={() => setValue('course')}>课程</button>
            <button type="button" className={value === 'exam' ? 'btn' : 'btn btn-ghost'} style={value === 'exam' ? { background: a } : undefined} onClick={() => setValue('exam')}>考试</button>
            <button type="button" className={value === 'classroom' ? 'btn' : 'btn btn-ghost'} style={value === 'classroom' ? { background: a } : undefined} onClick={() => setValue('classroom')}>教室</button>
          </div>
        ),
      },
      { key: 'title', label: '标题', placeholder: '高等数学 / 期中考试…' },
      { key: 'schedule_date', label: '日期', placeholder: '2026-03-15' },
      { key: 'time_slot', label: '时段', placeholder: '08:00-09:40', optional: true },
      { key: 'location', label: '地点', placeholder: '教学楼 A301', optional: true },
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
    if (!token || !values.title?.trim()) return
    setBusy(true)
    setMsg('')
    const category = (values.category === 'exam' || values.category === 'classroom') ? values.category : 'course'
    try {
      await apiFetch('/api/v1/class-schedule/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(),
          schedule_date: (values.schedule_date || '').trim(),
          time_slot: (values.time_slot || '').trim(),
          location: (values.location || '').trim(),
          category,
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'course' })
      setResetKey((k) => k + 1)
      setMsg('课表条目已发布')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const archive = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/class-schedule/records/${id}/archive`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`归档失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建课表</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '课表协作' : '课表查询'}
          meta={entrySource === 'im' ? '群入口' : '工作台'}
          accent={accent}
          flowHint={`类型 → 标题 → 日期 → 时段${user?.display_name ? ` · ${user.display_name}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="发布"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>课表列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.title}</strong>
              <span className="tag">{CAT_LABEL[t.category] || t.category} · {t.status === 'published' ? '已发布' : '已归档'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {t.schedule_date || '—'}{t.time_slot ? ` · ${t.time_slot}` : ''}{t.location ? ` · ${t.location}` : ''}
            </p>
            {t.status === 'published' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void archive(t.id)}>归档</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
