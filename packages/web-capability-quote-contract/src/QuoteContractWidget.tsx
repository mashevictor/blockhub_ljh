import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormFieldDef, SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, resolveFormSteps, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  customer: string
  amount: string
  note: string
  status: string
}

const COLUMNS = [
  { key: 'open', label: '报价' },
  { key: 'reviewing', label: '评审中', action: 'reviewing' },
  { key: 'approved', label: '已批准', action: 'approved' },
  { key: 'signed', label: '已签约', action: 'signed' },
] as const

function pick(values: Record<string, string>, ...keys: string[]) {
  for (const k of keys) {
    const v = (values[k] || '').trim()
    if (v) return v
  }
  return ''
}

export function QuoteContractWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const defaultCat = String(node.props?.default_category || 'quote')
  const formHeadline = String(node.props?.form_headline || '报价录入')

  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#6366f1'

  const steps: GtgtStep[] = useMemo(() => {
    const defaults: FormFieldDef[] = [
      { key: 'title', label: '报价/合同标题', placeholder: '标题' },
      { key: 'customer', label: '客户', placeholder: '客户名称', optional: true },
      { key: 'amount', label: '金额', placeholder: '金额', optional: true },
      { key: 'note', label: '说明（可空）', placeholder: '折扣理由 / 条款要点', type: 'textarea', optional: true },
    ]
    return resolveFormSteps({
      defaults,
      formFields: node.props?.form_fields,
      pageMockFields: (node.props?.page_mock as { fields?: unknown } | undefined)?.fields,
    })
  }, [node.props?.form_fields, node.props?.page_mock])

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
    const title = pick(values, 'title', 'contract_name', 'name', 'summary')
    if (!token || !title) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/quote-contract/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: defaultCat || 'quote',
          title,
          customer: pick(values, 'customer', 'company', 'client'),
          amount: pick(values, 'amount', 'discount', 'price'),
          note: pick(values, 'note', 'reason', 'discount_reason', 'summary'),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已写入真库')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const moveTo = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/quote-contract/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  return (
    <div>
      <GtgtStepComposer
        title={formHeadline}
        meta="Gtgt · Soft · 真库"
        accent={accent}
        variant="soft"
        flowHint=">> 单字段推进 → 提交真库"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={resetKey}
        submitLabel="录入"
      />
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))',
          gap: 8,
          overflowX: 'auto',
          marginTop: 16,
        }}
      >
        {COLUMNS.map((col) => {
          const colItems = items.filter((t) => t.status === col.key)
          return (
            <div key={col.key}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: col.key === 'open' ? accent : 'rgba(0,0,0,0.06)',
                  color: col.key === 'open' ? '#fff' : 'inherit',
                }}
              >
                {col.label} · {colItems.length}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {colItems.map((t) => (
                  <li key={t.id} className="list-card" style={{ padding: 10 }}>
                    <strong style={{ fontSize: 13 }}>{t.title}</strong>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                      {t.customer || '客户待定'}
                      {t.amount ? ` · ¥${t.amount}` : ''}
                      {t.category ? ` · ${t.category}` : ''}
                    </p>
                    <div className="row-actions" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {COLUMNS.filter((c) => 'action' in c && c.action && c.key !== t.status).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                          onClick={() => void moveTo(t.id, (c as { action: string }).action)}
                        >
                          →{c.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
