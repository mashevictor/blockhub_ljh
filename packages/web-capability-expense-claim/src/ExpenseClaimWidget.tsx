import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTf } from '@blockhub/i18n/react'
import type { FormFieldDef, SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, resolveFormSteps, useRuntime, type GtgtStep } from '@blockhub/web-core'

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

export function ExpenseClaimWidget({ node }: { node: SchemaNode }) {
  const tf = useTf()
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const catLabel = useCallback(
    (key: string) => tf(`cap.expense_claim.cat.${key}`, key),
    [tf],
  )
  const statusLabel = useCallback(
    (key: string) => tf(`cap.expense_claim.status.${key}`, key),
    [tf],
  )
  const defaultCat = String(node.props?.default_category || 'travel')
  const sceneLabel = String(node.props?.scene_label || node.props?.form_headline || '')
  const formHeadline = String(node.props?.form_headline || '')
  const isSample =
    defaultCat === 'sample' ||
    defaultCat === 'sales-enablement' ||
    sceneLabel.includes('样品') ||
    sceneLabel.includes('礼品')
  const isHospitality =
    defaultCat === 'hospitality' || defaultCat === 'field-coordination' || sceneLabel.includes('招待')
  const isLoan = defaultCat === 'loan' || sceneLabel.includes('借款')
  const isPayment = defaultCat === 'payment' || sceneLabel.includes('付款')
  const isInvoice =
    defaultCat === 'invoice' ||
    defaultCat === 'invoice-request' ||
    sceneLabel.includes('发票') ||
    sceneLabel.includes('开票')
  const initialCat = isSample
    ? 'sample'
    : isHospitality
      ? 'hospitality'
      : isInvoice
        ? 'invoice'
        : isLoan
          ? 'loan'
          : isPayment
            ? 'payment'
            : defaultCat || 'travel'

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

  const formTitle =
    formHeadline ||
    (isSample
      ? tf('cap.expense_claim.cat.sample', '样品礼品')
      : isHospitality
        ? tf('cap.expense_claim.cat.hospitality', '客户招待')
        : isInvoice
          ? tf('cap.expense_claim.cat.invoice', '发票')
          : isLoan
            ? tf('cap.expense_claim.cat.loan', '借款')
            : isPayment
              ? tf('cap.expense_claim.cat.payment', '付款')
              : tf('cap.expense_claim.title.default', '费用报销'))
  const submitLabel =
    isSample || isHospitality
      ? tf('cap.expense_claim.submit.apply', '提交申请')
      : tf('cap.expense_claim.submit.default', '提交报销')

  const catOptions = useMemo(() => {
    if (isSample) return [['sample', catLabel('sample')]] as const
    if (isHospitality) return [['hospitality', catLabel('hospitality')]] as const
    if (isLoan) return [['loan', catLabel('loan')]] as const
    if (isPayment) return [['payment', catLabel('payment')]] as const
    if (isInvoice) return [['invoice', catLabel('invoice')]] as const
    return (
      [
        ['sample', catLabel('sample')],
        ['hospitality', catLabel('hospitality')],
        ['travel', catLabel('travel')],
        ['meal', catLabel('meal')],
        ['office', catLabel('office')],
        ['invoice', catLabel('invoice')],
        ['loan', catLabel('loan')],
        ['payment', catLabel('payment')],
      ] as const
    )
  }, [isSample, isHospitality, isLoan, isPayment, isInvoice, catLabel])

  const steps: GtgtStep[] = useMemo(() => {
    const defaults: FormFieldDef[] = [
      { key: 'category', label: tf('cap.expense_claim.field.category', '类型') },
      {
        key: 'title',
        label: tf('cap.expense_claim.field.title', '申请内容'),
        placeholder: isSample ? '样品 / 礼品名称' : '事由摘要',
      },
      {
        key: 'amount',
        label: tf('cap.expense_claim.field.amount', '金额（元）'),
        placeholder: '328.00',
      },
      {
        key: 'invoice_no',
        label: tf('cap.expense_claim.field.invoice_no', '单号（可空）'),
        placeholder: '发票或合同号',
        optional: true,
      },
      {
        key: 'note',
        label: tf('cap.expense_claim.field.note', '说明（可空）'),
        placeholder: '客户 / 用途',
        type: 'textarea',
        optional: true,
      },
    ]
    const resolved = resolveFormSteps({
      defaults,
      formFields: node.props?.form_fields,
      pageMockFields: (node.props?.page_mock as { fields?: unknown } | undefined)?.fields,
    })
    return resolved.map((s) => {
      if (s.key !== 'category') return s
      return {
        ...s,
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
      }
    })
  }, [catOptions, initialCat, isSample, isHospitality, isInvoice, node.props?.form_fields, node.props?.page_mock, tf])

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
    const title = (values.title || values.item || values.name || '').trim()
    const amount = (values.amount || values.quantity || '').trim()
    if (!token || !title || !amount) return
    setBusy(true)
    setMsg('')
    const cat = values.category || initialCat
    try {
      await apiFetch('/api/v1/expense-claim/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: cat,
          title,
          amount,
          invoice_no: (values.invoice_no || '').trim(),
          note: (values.note || values.purpose || values.customer || '').trim(),
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
          flowHint=">> 单字段推进 → 写入真库"
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
                    {catLabel(t.category)} · {t.title}
                  </strong>
                  <span className="tag">{statusLabel(t.status)}</span>
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
                          {catLabel(t.category)} · {t.title}
                        </strong>
                        <span className="tag">{statusLabel(t.status)}</span>
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
