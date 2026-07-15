import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  dept: string
  answer: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  answered: 'answered',
  archived: 'archived',
}

export function PolicyQaWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'ask' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#6366f1'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'ask') === 'ask' ? 'btn' : 'btn btn-ghost'} style={(value || 'ask') === 'ask' ? { background: a } : undefined} onClick={() => setValue('ask')}>提问</button>
            <button type="button" className={(value || 'ask') === 'policy' ? 'btn' : 'btn btn-ghost'} style={(value || 'ask') === 'policy' ? { background: a } : undefined} onClick={() => setValue('policy')}>制度</button>
            <button type="button" className={(value || 'ask') === 'benefit' ? 'btn' : 'btn btn-ghost'} style={(value || 'ask') === 'benefit' ? { background: a } : undefined} onClick={() => setValue('benefit')}>福利</button>
          </div>
        ),
      },
      { key: 'title', label: '问题/制度名', placeholder: '问题/制度名' },
      { key: 'dept', label: '适用部门', placeholder: '适用部门', optional: true },
      { key: 'answer', label: '答复摘要', placeholder: '答复摘要', optional: true },
      { key: 'note', label: '备注', placeholder: '备注', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/policy-qa/records${q}`, token)
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
    const category = values.category || 'ask'
    try {
      await apiFetch('/api/v1/policy-qa/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          title: (values.title || '').trim(),
          dept: (values.dept || '').trim(),
          answer: (values.answer || '').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'ask' })
      setResetKey((k) => k + 1)
      setMsg('已提交')
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
      await apiFetch(`/api/v1/policy-qa/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建制度问答</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '制度问答协作' : '制度问答'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`登记 → 状态跟进闭环${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 待处理 ${openCount}` : ''}`}
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

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>制度问答列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {(t as any).title || t.category}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.category}{t.note ? ` · ${t.note}` : ''}</p>
            {t.status !== 'answered' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'answered')}>已答复</button>
            )}
            {t.status !== 'archived' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'archived')}>归档</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
