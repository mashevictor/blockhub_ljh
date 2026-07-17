import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  location: string
  sku_code: string
  qty: string
  note: string
  status: string
}

export function InventoryCountWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0369a1'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'location', label: '货位（可空）', placeholder: '货位（可空）', optional: true },
      { key: 'sku_code', label: 'SKU / 条码', placeholder: 'SKU / 条码' },
      { key: 'qty', label: '实盘数量', placeholder: '实盘数量', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/inventory-count/records${q}`, token)
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
    if (!token || !values.sku_code?.trim()) {
      setMsg('请填写 SKU')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/inventory-count/records', token, {
        method: 'POST',
        body: JSON.stringify({
          location: (values.location || '').trim() || '默认货位',
          sku_code: values.sku_code.trim(),
          qty: (values.qty || '').trim() || '0',
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已录入盘点行')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/inventory-count/records/${id}/confirm`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const pending = items.filter((t) => t.status === 'pending')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="扫码盘点"
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
          submitLabel="录入本行"
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            待确认入库{pending.length ? ` · ${pending.length}` : ''}
          </h4>
          {loading && <p className="muted">加载中…</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {pending.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>{t.sku_code}</strong>
                  <span className="tag">×{t.qty}</span>
                </div>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  {t.location}
                </p>
                <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void confirm(t.id)}>
                  确认入库
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
