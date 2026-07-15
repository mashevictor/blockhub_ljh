import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  dept: string
  ticket_no: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  processing: 'processing',
  done: '已完成',
}

export function GovServiceWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'guide' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#475569'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'guide') === 'guide' ? 'btn' : 'btn btn-ghost'} style={(value || 'guide') === 'guide' ? { background: a } : undefined} onClick={() => setValue('guide')}>指南</button>
            <button type="button" className={(value || 'guide') === 'appeal' ? 'btn' : 'btn btn-ghost'} style={(value || 'guide') === 'appeal' ? { background: a } : undefined} onClick={() => setValue('appeal')}>诉求</button>
            <button type="button" className={(value || 'guide') === 'progress' ? 'btn' : 'btn btn-ghost'} style={(value || 'guide') === 'progress' ? { background: a } : undefined} onClick={() => setValue('progress')}>进度</button>
          </div>
        ),
      },
      { key: 'title', label: '事项标题', placeholder: '事项标题' },
      { key: 'dept', label: '部门/窗口', placeholder: '部门/窗口', optional: true },
      { key: 'ticket_no', label: '受理号', placeholder: '受理号', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/gov-service/records${q}`, token)
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
    const category = values.category || 'guide'
    try {
      await apiFetch('/api/v1/gov-service/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,,
          title: (values.title || '').trim(),
          dept: (values.dept || '').trim(),
          ticket_no: (values.ticket_no || '').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'guide' })
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
      await apiFetch(`/api/v1/gov-service/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建政务办事</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '政务办事协作' : '政务办事'}
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

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>政务办事列表</h4>
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
            {t.status !== 'processing' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'processing')}>办理中</button>
            )}
            {t.status !== 'done' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'done')}>办结</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
