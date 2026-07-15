import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  customer: string
  amount: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  reviewing: 'reviewing',
  approved: 'approved',
  signed: 'signed',
}

export function QuoteContractWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'quote' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#dc2626'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'quote') === 'quote' ? 'btn' : 'btn btn-ghost'} style={(value || 'quote') === 'quote' ? { background: a } : undefined} onClick={() => setValue('quote')}>报价</button>
            <button type="button" className={(value || 'quote') === 'contract' ? 'btn' : 'btn btn-ghost'} style={(value || 'quote') === 'contract' ? { background: a } : undefined} onClick={() => setValue('contract')}>合同</button>
            <button type="button" className={(value || 'quote') === 'special' ? 'btn' : 'btn btn-ghost'} style={(value || 'quote') === 'special' ? { background: a } : undefined} onClick={() => setValue('special')}>特价</button>
          </div>
        ),
      },
      { key: 'title', label: '标题', placeholder: '标题' },
      { key: 'customer', label: '客户', placeholder: '客户', optional: true },
      { key: 'amount', label: '金额', placeholder: '金额', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/quote-contract/records${q}`, token)
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
    const category = values.category || 'quote'
    try {
      await apiFetch('/api/v1/quote-contract/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          title: (values.title || '').trim(),
          customer: (values.customer || '').trim(),
          amount: (values.amount || '').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'quote' })
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
      await apiFetch(`/api/v1/quote-contract/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建报价合同</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '报价合同协作' : '报价合同'}
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

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>报价合同列表</h4>
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
            {t.status !== 'reviewing' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'reviewing')}>评审中</button>
            )}
            {t.status !== 'approved' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'approved')}>已批准</button>
            )}
            {t.status !== 'signed' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'signed')}>已签约</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
