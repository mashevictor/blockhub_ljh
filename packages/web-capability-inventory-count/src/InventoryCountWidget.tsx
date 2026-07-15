import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

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

const STEPS = ['货位', 'SKU', '盘点数量'] as const

export function InventoryCountWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [location, setLocation] = useState('')
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('0')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#f97316'
  const pending = items.filter((t) => t.status === 'pending').length

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
    if (!token || !sku.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/inventory-count/records', token, {
        method: 'POST',
        body: JSON.stringify({
          location: location.trim(),
          sku_code: sku.trim(),
          qty: Number(qty) || 0,
          note: note.trim(),
          app_public_id: appId || '',
        }),
      })
      setLocation('')
      setSku('')
      setQty('0')
      setNote('')
      setStep(0)
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
    <div className="widget bh-flow-form" style={{ ['--accent' as string]: accent }}>
      <div className="bh-flow-head">
        <h3>{entrySource === 'im' ? '盘点协作' : '库存盘点'}</h3>
        <span className="bh-flow-meta">{entrySource === 'im' ? '群消息入口' : '应用工作台'}</span>
      </div>
      <p className="muted">
        扫码/填 SKU → 录入数量 → 确认入库
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>
      <ol className="bh-process-flow">
        <li className={showForm ? 'is-active' : 'is-done'}>① 录入</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={pending ? 'is-active' : ''}>② 待确认{pending ? `（${pending}）` : ''}</li>
        <span className="arrow" aria-hidden>→</span>
        <li>③ 已确认</li>
      </ol>

      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建盘点</button>
      ) : (
        <>
          <div className="bh-flow-steps">
            {STEPS.map((label, i) => (
              <div key={label} className={`bh-flow-step${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}>
                <span className="bh-flow-dot" style={i <= step ? { background: accent } : undefined} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="bh-flow-body">
            {step === 0 && (
              <label>货位 / 仓位
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="A区-3货架" autoFocus />
              </label>
            )}
            {step === 1 && (
              <label>SKU / 物料编码
                <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-10086" autoFocus />
              </label>
            )}
            {step === 2 && (
              <>
                <label>实盘数量
                  <input className="input" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
                </label>
                <label>备注
                  <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="破损、临期…" />
                </label>
              </>
            )}
            <div className="bh-flow-actions">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>上一步</button>}
              {step < 2 ? (
                <button type="button" className="btn" style={{ background: accent }} disabled={step === 1 && !sku.trim()} onClick={() => setStep((s) => s + 1)}>下一步</button>
              ) : (
                <button type="button" className="btn" style={{ background: accent }} disabled={busy || !sku.trim()} onClick={() => void submit()}>{busy ? '提交中…' : '提交盘点'}</button>
              )}
            </div>
          </div>
        </>
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
