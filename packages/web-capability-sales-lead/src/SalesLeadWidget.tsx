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

const COLUMNS: { key: string; label: string; action?: string }[] = [
  { key: 'open', label: '新线索' },
  { key: 'following', label: '跟进中', action: 'following' },
  { key: 'won', label: '成交', action: 'won' },
  { key: 'lost', label: '丢单', action: 'lost' },
]

export function SalesLeadWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const accent = primaryColor || '#ef4444'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'customer', label: '客户名称', placeholder: '客户名称' },
      { key: 'amount', label: '金额（可空）', placeholder: '金额（可空）', optional: true },
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
    try {
      await apiFetch('/api/v1/sales-lead/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'lead',
          customer: values.customer.trim(),
          amount: (values.amount || '').trim(),
          owner: user?.display_name || '',
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已加入看板')
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
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      <GtgtStepComposer
        title="新线索"
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
                    </p>
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
