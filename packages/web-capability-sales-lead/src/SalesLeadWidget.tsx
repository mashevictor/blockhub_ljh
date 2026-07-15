import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  customer: string
  amount: string
  owner: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  following: '跟进中',
  won: 'won',
  lost: 'lost',
}

export function SalesLeadWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'lead' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#ef4444'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '阶段',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'lead') === 'lead' ? 'btn' : 'btn btn-ghost'} style={(value || 'lead') === 'lead' ? { background: a } : undefined} onClick={() => setValue('lead')}>线索</button>
            <button type="button" className={(value || 'lead') === 'opportunity' ? 'btn' : 'btn btn-ghost'} style={(value || 'lead') === 'opportunity' ? { background: a } : undefined} onClick={() => setValue('opportunity')}>商机</button>
            <button type="button" className={(value || 'lead') === 'account' ? 'btn' : 'btn btn-ghost'} style={(value || 'lead') === 'account' ? { background: a } : undefined} onClick={() => setValue('account')}>客户</button>
          </div>
        ),
      },
      { key: 'customer', label: '客户名称', placeholder: '客户名称' },
      { key: 'amount', label: '预计金额', placeholder: '预计金额', optional: true },
      { key: 'owner', label: '跟进人', placeholder: '跟进人', optional: true },
      { key: 'note', label: '跟进备注', placeholder: '跟进备注', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/sales-lead/records${q}`, token)
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
    if (!token || !values.customer?.trim()) return
    setBusy(true)
    setMsg('')
    const category = values.category || 'lead'
    try {
      await apiFetch('/api/v1/sales-lead/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          customer: (values.customer || '').trim(),
          amount: (values.amount || '').trim(),
          owner: (values.owner || '').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'lead' })
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
      await apiFetch(`/api/v1/sales-lead/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建销售线索</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '销售线索协作' : '销售线索'}
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

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>销售线索列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {(t as any).customer || t.category}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.category}{t.note ? ` · ${t.note}` : ''}</p>
            {t.status !== 'following' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'following')}>跟进中</button>
            )}
            {t.status !== 'won' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'won')}>成交</button>
            )}
            {t.status !== 'lost' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'lost')}>丢单</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
