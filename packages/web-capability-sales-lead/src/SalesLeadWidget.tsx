import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormFieldDef, SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, resolveFormSteps, useRuntime, type GtgtStep } from '@blockhub/web-core'

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

const COLUMNS: { key: string; label: string; action?: string }[] = [
  { key: 'open', label: '新线索' },
  { key: 'following', label: '跟进中', action: 'following' },
  { key: 'won', label: '成交', action: 'won' },
  { key: 'lost', label: '丢单', action: 'lost' },
]

function pick(values: Record<string, string>, ...keys: string[]) {
  for (const k of keys) {
    const v = (values[k] || '').trim()
    if (v) return v
  }
  return ''
}

export function SalesLeadWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const defaultCat = String(node.props?.default_category || 'lead')
  const formHeadline = String(node.props?.form_headline || '新线索')

  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const accent = primaryColor || '#6366f1'

  const steps: GtgtStep[] = useMemo(() => {
    const defaults: FormFieldDef[] = [
      { key: 'customer', label: '客户名称', placeholder: '客户 / 公司名称' },
      { key: 'amount', label: '金额（可空）', placeholder: '预计金额', optional: true },
      { key: 'owner', label: '负责人（可空）', placeholder: '跟进人', optional: true },
      { key: 'note', label: '备注（可空）', placeholder: '跟进纪要 / 来源', type: 'textarea', optional: true },
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
    const customer = pick(values, 'customer', 'company', 'title', 'lead_name', 'name')
    if (!token || !customer) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/sales-lead/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: defaultCat || 'lead',
          customer,
          amount: pick(values, 'amount', 'score', 'phone', 'quantity'),
          owner: pick(values, 'owner', 'contact', 'assignee', 'phone') || user?.display_name || '',
          note: pick(values, 'note', 'content', 'reason', 'source', 'next_action', 'summary'),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已写入真库')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const moveTo = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/sales-lead/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      setMsg('')
      await load()
    } catch (e) {
      const detail = String(e)
      setMsg(
        action === 'following' || action === 'won'
          ? `晋级被拦：${detail}（请先到「成交证据」登记）`
          : `更新失败：${detail}`,
      )
    }
  }

  return (
    <div>
      <GtgtStepComposer
        title={formHeadline}
        meta={user?.display_name || '销售'}
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
          gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
          gap: 10,
          overflowX: 'auto',
          marginTop: 16,
        }}
      >
        {COLUMNS.map((col) => {
          const colItems = items.filter((t) => t.status === col.key)
          return (
            <div key={col.key} style={{ minWidth: 140 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
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
                    <strong style={{ fontSize: 13 }}>{t.customer}</strong>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                      {t.amount ? `¥${t.amount}` : '金额待定'}
                      {t.owner ? ` · ${t.owner}` : ''}
                      {t.category ? ` · ${t.category}` : ''}
                    </p>
                    {t.note ? (
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                        {t.note.slice(0, 80)}
                      </p>
                    ) : null}
                    <div className="row-actions" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                      {COLUMNS.filter((c) => c.action && c.key !== t.status).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                          onClick={() => void moveTo(t.id, c.action!)}
                        >
                          →{c.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
                {!loading && colItems.length === 0 && (
                  <li className="muted" style={{ fontSize: 12, padding: 8 }}>
                    空
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
