import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  location: string
  sku_code: string
  qty: number
  note: string
  status: string
  reporter_name?: string
}

export function InventoryCountWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({
    location: '',
    sku: '',
    qty: '0',
    note: '',
  })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')
  const accent = primaryColor || '#f97316'
  const pending = items.filter((t) => t.status === 'pending').length

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'location', label: '货位', placeholder: 'A区-3货架', optional: true },
      { key: 'sku', label: 'SKU', placeholder: 'SKU-10086' },
      { key: 'qty', label: '实盘数量', placeholder: '0' },
      { key: 'note', label: '备注', placeholder: '破损、临期…', optional: true },
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
    if (!token || !values.sku?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/inventory-count/records', token, {
        method: 'POST',
        body: JSON.stringify({
          location: (values.location || '').trim(),
          sku_code: values.sku.trim(),
          qty: Number(values.qty) || 0,
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ location: '', sku: '', qty: '0', note: '' })
      setResetKey((k) => k + 1)
      setMsg('盘点已录入，待主管确认')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/inventory-count/records/${id}/confirm`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`确认失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建盘点</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '盘点协作' : '库存盘点'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`扫码/填 SKU → 录入数量 → 确认入库${user?.display_name ? ` · ${user.display_name}` : ''}${pending ? ` · 待确认 ${pending}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交盘点"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>盘点单</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.sku_code}</strong>
              <span className="tag">{t.status === 'pending' ? '待确认' : '已确认'} · qty {t.qty}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.location} · {t.reporter_name || '—'}</p>
            {t.status === 'pending' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void confirm(t.id)}>确认入库</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
