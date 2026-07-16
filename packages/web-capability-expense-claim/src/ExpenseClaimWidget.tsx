import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  amount: string
  invoice_no: string
  note: string
  status: string
  reporter_name?: string
}

const CAT_LABEL: Record<string, string> = {
  travel: '差旅',
  meal: '餐饮',
  office: '办公',
  loan: '借款',
  payment: '付款',
}

const STATUS_LABEL: Record<string, string> = {
  open: '待审核',
  reviewing: '审核中',
  paid: '已付款',
  rejected: '已驳回',
}

export function ExpenseClaimWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const defaultCat = String(node.props?.default_category || 'travel')
  const sceneLabel = String(node.props?.scene_label || '')
  const isLoan = defaultCat === 'loan' || sceneLabel.includes('借款')
  const isPayment = defaultCat === 'payment' || sceneLabel.includes('付款')
  const initialCat = isLoan ? 'loan' : isPayment ? 'payment' : defaultCat || 'travel'

  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: initialCat })
  const [msg, setMsg] = useState('')
  const [showDone, setShowDone] = useState(false)

  const accent = primaryColor || '#0284c7'
  const pending = items.filter((t) => t.status === 'open' || t.status === 'reviewing')
  const done = items.filter((t) => t.status === 'paid' || t.status === 'rejected')

  const formTitle = isLoan ? '借款申请' : isPayment ? '付款申请' : '费用报销'
  const submitLabel = isLoan ? '提交借款' : isPayment ? '提交付款' : '提交报销'
  const titlePlaceholder = isLoan ? '如：备用金借款' : isPayment ? '如：供应商货款' : '如：上海出差高铁'

  const catOptions = useMemo(() => {
    if (isLoan) return [['loan', '借款']] as const
    if (isPayment) return [['payment', '付款']] as const
    return [
      ['travel', '差旅'],
      ['meal', '餐饮'],
      ['office', '办公'],
      ['loan', '借款'],
      ['payment', '付款'],
    ] as const
  }, [isLoan, isPayment])

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '费用类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {catOptions.map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || initialCat) === k ? 'btn' : 'btn btn-ghost'}
                style={(value || initialCat) === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'title', label: isLoan || isPayment ? '申请事由' : '报销内容', placeholder: titlePlaceholder },
      { key: 'amount', label: '金额（元）', placeholder: '328.00' },
      { key: 'invoice_no', label: '发票/单号（可空）', placeholder: '发票或合同号', optional: true },
    ],
    [catOptions, initialCat, isLoan, isPayment, titlePlaceholder],
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/expense-claim/records${q}`, token)
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
    if (!token || !values.title?.trim() || !values.amount?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/expense-claim/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: values.category || initialCat,
          title: values.title.trim(),
          amount: values.amount.trim(),
          invoice_no: (values.invoice_no || '').trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({ category: initialCat })
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
      await apiFetch(`/api/v1/expense-claim/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title={formTitle}
          meta={entrySource === 'im' ? '群消息入口' : user?.display_name || '申请人'}
          accent={accent}
          flowHint="选类型 → 填金额 → 写入数据库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel={submitLabel}
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            待审 {pending.length ? `· ${pending.length}` : ''}
          </h4>
          {loading && <p className="muted">加载中…</p>}
          {!loading && pending.length === 0 && <p className="muted">暂无待审单据</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {pending.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {CAT_LABEL[t.category] || t.category} · {t.title}
                  </strong>
                  <span className="tag">{STATUS_LABEL[t.status]}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>¥{t.amount}</p>
                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'paid')}>
                    通过付款
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'rejected')}>
                    驳回
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {done.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowDone((v) => !v)}>
                {showDone ? '收起已处理' : `已处理 ${done.length}`}
              </button>
              {showDone && (
                <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                  {done.map((t) => (
                    <li key={t.id} className="list-card" style={{ opacity: 0.85 }}>
                      <div className="list-card-head">
                        <strong>
                          {CAT_LABEL[t.category] || t.category} · {t.title}
                        </strong>
                        <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
