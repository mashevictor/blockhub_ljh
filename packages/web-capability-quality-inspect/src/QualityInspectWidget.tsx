import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  product_code: string
  process_name: string
  result: string
  note: string
  status: string
  reporter_name?: string
}

const STEPS = ['产品/批次', '工序', '质检结论'] as const

export function QualityInspectWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [product, setProduct] = useState('')
  const [processName, setProcessName] = useState('')
  const [result, setResult] = useState<'pass' | 'fail'>('pass')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#0ea5e9'
  const openCount = items.filter((t) => t.status === 'open').length

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/quality-inspect/records${q}`, token)
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
    if (!token || !product.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/quality-inspect/records', token, {
        method: 'POST',
        body: JSON.stringify({
          product_code: product.trim(),
          process_name: processName.trim(),
          result,
          note: note.trim(),
          app_public_id: appId || '',
        }),
      })
      setProduct('')
      setProcessName('')
      setResult('pass')
      setNote('')
      setStep(0)
      setMsg('质检已入库；不合格会推群（若已绑 IM）')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const closeRec = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/quality-inspect/records/${id}/close`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`闭环失败：${String(e)}`)
    }
  }

  return (
    <div className="widget bh-flow-form" style={{ ['--accent' as string]: accent }}>
      <div className="bh-flow-head">
        <h3>{entrySource === 'im' ? '质检协作' : '质检 SOP'}</h3>
        <span className="bh-flow-meta">{entrySource === 'im' ? '群消息入口' : '应用工作台'}</span>
      </div>
      <p className="muted">
        录入质检 → 异常推群 → 闭环
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>
      <ol className="bh-process-flow">
        <li className={showForm ? 'is-active' : 'is-done'}>① 录入</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={openCount ? 'is-active' : ''}>② 待闭环{openCount ? `（${openCount}）` : ''}</li>
        <span className="arrow" aria-hidden>→</span>
        <li>③ 已关闭</li>
      </ol>

      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建质检记录</button>
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
              <label>产品 / 批次号
                <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="如 LOT-20260715-A" autoFocus />
              </label>
            )}
            {step === 1 && (
              <label>工序 / SOP 节点
                <input className="input" value={processName} onChange={(e) => setProcessName(e.target.value)} placeholder="终检 / 焊接 / 涂装…" autoFocus />
              </label>
            )}
            {step === 2 && (
              <>
                <div className="row-actions">
                  <button type="button" className={result === 'pass' ? 'btn' : 'btn btn-ghost'} style={result === 'pass' ? { background: accent } : undefined} onClick={() => setResult('pass')}>合格</button>
                  <button type="button" className={result === 'fail' ? 'btn' : 'btn btn-ghost'} style={result === 'fail' ? { background: '#b91c1c' } : undefined} onClick={() => setResult('fail')}>不合格</button>
                </div>
                <label>备注
                  <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="缺陷描述、量具读数…" />
                </label>
              </>
            )}
            <div className="bh-flow-actions">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>上一步</button>}
              {step < 2 ? (
                <button type="button" className="btn" style={{ background: accent }} disabled={step === 0 && !product.trim()} onClick={() => setStep((s) => s + 1)}>下一步</button>
              ) : (
                <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>{busy ? '提交中…' : '提交质检'}</button>
              )}
            </div>
          </div>
        </>
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>质检记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.product_code}</strong>
              <span className="tag">{t.result === 'pass' ? '合格' : '不合格'} · {t.status === 'open' ? '待闭环' : '已关闭'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.process_name} · {t.reporter_name || '—'}</p>
            {t.note && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.note}</p>}
            {t.status === 'open' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void closeRec(t.id)}>确认闭环</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
