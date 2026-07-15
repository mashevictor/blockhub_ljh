import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  student_name: string
  subject: string
  category: string
  title: string
  content: string
  status: string
  reporter_name?: string
}

export function HomeworkQaWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'homework' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#3b82f6'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'homework') === 'homework' ? 'btn' : 'btn btn-ghost'} style={(value || 'homework') === 'homework' ? { background: a } : undefined} onClick={() => setValue('homework')}>作业</button>
            <button type="button" className={value === 'qa' ? 'btn' : 'btn btn-ghost'} style={value === 'qa' ? { background: a } : undefined} onClick={() => setValue('qa')}>答疑</button>
            <button type="button" className={value === 'wrongbook' ? 'btn' : 'btn btn-ghost'} style={value === 'wrongbook' ? { background: a } : undefined} onClick={() => setValue('wrongbook')}>错题</button>
          </div>
        ),
      },
      { key: 'student_name', label: '学生姓名', placeholder: user?.display_name || '', optional: true },
      { key: 'subject', label: '科目', placeholder: '语文 / 数学', optional: true },
      { key: 'title', label: '标题', placeholder: '第三单元练习' },
      { key: 'content', label: '内容/题目', placeholder: '作答内容或疑问…', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/homework-qa/records${q}`, token)
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
    const category = (values.category === 'qa' || values.category === 'wrongbook') ? values.category : 'homework'
    try {
      await apiFetch('/api/v1/homework-qa/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          student_name: (values.student_name || '').trim() || user?.display_name || '',
          subject: (values.subject || '').trim(),
          title: values.title.trim(),
          content: (values.content || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'homework' })
      setResetKey((k) => k + 1)
      setMsg('已提交 · 待批改')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const review = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/homework-qa/records/${id}/review`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`批改失败：${String(e)}`)
    }
  }

  const catLabel = (c: string) => (c === 'qa' ? '答疑' : c === 'wrongbook' ? '错题' : '作业')

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建作业/答疑</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '作业协作' : '作业答疑'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`提交作业/答疑 → 批改 → 完成${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 待批改 ${openCount}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>作业/答疑列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.title}</strong>
              <span className="tag">{catLabel(t.category)} · {t.status === 'open' ? '待批改' : '已完成'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.student_name} · {t.subject}</p>
            {t.content && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.content}</p>}
            {t.status === 'open' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void review(t.id)}>确认批改</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
