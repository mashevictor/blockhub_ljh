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
}

const COLUMNS = [
  { key: 'open', label: '报价' },
  { key: 'reviewing', label: '评审中', action: 'reviewing' },
  { key: 'approved', label: '已批准', action: 'approved' },
  { key: 'signed', label: '已签约', action: 'signed' },
] as const

export function QuoteContractWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0284c7'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'title', label: '报价标题', placeholder: '报价标题' },
      { key: 'customer', label: '客户', placeholder: '客户', optional: true },
      { key: 'amount', label: '金额', placeholder: '金额', optional: true },
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
    if (!token || !values.title?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/quote-contract/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'quote',
          title: values.title.trim(),
          customer: (values.customer || '').trim(),
          amount: (values.amount || '').trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已进入报价板')
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
        title="报价录入"
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
