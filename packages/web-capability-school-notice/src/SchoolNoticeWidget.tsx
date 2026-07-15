import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  audience: string
  category: string
  content: string
  status: string
  reporter_name?: string
}

export function SchoolNoticeWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({
    category: 'notice',
    audience: '全班家长',
  })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#22c55e'
  const pending = items.filter((t) => t.status === 'published').length

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'notice') === 'notice' ? 'btn' : 'btn btn-ghost'} style={(value || 'notice') === 'notice' ? { background: a } : undefined} onClick={() => setValue('notice')}>通知</button>
            <button type="button" className={value === 'signup' ? 'btn' : 'btn btn-ghost'} style={value === 'signup' ? { background: a } : undefined} onClick={() => setValue('signup')}>报名</button>
            <button type="button" className={value === 'message' ? 'btn' : 'btn btn-ghost'} style={value === 'message' ? { background: a } : undefined} onClick={() => setValue('message')}>留言</button>
          </div>
        ),
      },
      { key: 'audience', label: '受众', placeholder: '三年二班家长' },
      { key: 'title', label: '标题', placeholder: '春季运动会报名' },
      { key: 'content', label: '正文', placeholder: '通知详情…', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/school-notice/records${q}`, token)
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
    const category = (values.category === 'signup' || values.category === 'message') ? values.category : 'notice'
    try {
      await apiFetch('/api/v1/school-notice/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          audience: (values.audience || '全班家长').trim(),
          title: values.title.trim(),
          content: (values.content || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'notice', audience: '全班家长' })
      setResetKey((k) => k + 1)
      setMsg('已发布 · 等待家长回执')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const ack = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/school-notice/records/${id}/ack`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`回执失败：${String(e)}`)
    }
  }

  const catLabel = (c: string) => (c === 'signup' ? '报名' : c === 'message' ? '留言' : '通知')

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建通知</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '家校协作' : '家校通知'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`发布通知 → 家长回执 → 已确认${user?.display_name ? ` · ${user.display_name}` : ''}${pending ? ` · 待回执 ${pending}` : ''}`}
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

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>通知列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.title}</strong>
              <span className="tag">{catLabel(t.category)} · {t.status === 'published' ? '待回执' : '已确认'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.audience} · {t.reporter_name || '—'}</p>
            {t.content && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.content}</p>}
            {t.status === 'published' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void ack(t.id)}>家长已回执</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
