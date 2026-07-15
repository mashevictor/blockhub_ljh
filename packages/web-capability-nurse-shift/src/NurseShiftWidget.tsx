import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  nurse_name: string
  shift_date: string
  from_shift: string
  to_shift: string
  reason: string
  status: string
  reporter_name?: string
}

const STEPS = ['值班日', '班次', '原因'] as const

export function NurseShiftWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [nurseName, setNurseName] = useState('')
  const [shiftDate, setShiftDate] = useState('')
  const [fromShift, setFromShift] = useState('白班')
  const [toShift, setToShift] = useState('夜班')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#059669'
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/nurse-shift/records${q}`, token)
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
    if (!token || !shiftDate.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/nurse-shift/records', token, {
        method: 'POST',
        body: JSON.stringify({
          nurse_name: nurseName.trim() || user?.display_name || '',
          shift_date: shiftDate.trim(),
          from_shift: fromShift.trim(),
          to_shift: toShift.trim(),
          reason: reason.trim(),
          app_public_id: appId || '',
        }),
      })
      setNurseName('')
      setShiftDate('')
      setFromShift('白班')
      setToShift('夜班')
      setReason('')
      setStep(0)
      setMsg('调班已提交 · 待护士长批复')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const decide = async (id: string, approve: boolean) => {
    if (!token) return
    const path = approve ? 'approve' : 'reject'
    try {
      await apiFetch(`/api/v1/nurse-shift/records/${id}/${path}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`操作失败：${String(e)}`)
    }
  }

  const statusLabel = (s: string) => (s === 'pending' ? '待批复' : s === 'approved' ? '已通过' : '已驳回')

  return (
    <div className="widget bh-flow-form" style={{ ['--accent' as string]: accent }}>
      <div className="bh-flow-head">
        <h3>{entrySource === 'im' ? '排班协作' : '护士排班'}</h3>
        <span className="bh-flow-meta">{entrySource === 'im' ? '群消息入口' : '应用工作台'}</span>
      </div>
      <p className="muted">
        调班申请 → 护士长批复 → 值班通知
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>
      <ol className="bh-process-flow">
        <li className={showForm ? 'is-active' : 'is-done'}>① 申请</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={pending ? 'is-active' : ''}>② 待批复{pending ? `（${pending}）` : ''}</li>
        <span className="arrow" aria-hidden>→</span>
        <li>③ 已决策</li>
      </ol>

      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建调班申请</button>
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
              <>
                <label>护士姓名
                  <input className="input" value={nurseName} onChange={(e) => setNurseName(e.target.value)} placeholder={user?.display_name || '可默认当前用户'} autoFocus />
                </label>
                <label>值班日期
                  <input className="input" type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <label>原班次
                  <input className="input" value={fromShift} onChange={(e) => setFromShift(e.target.value)} placeholder="白班 / 小夜 / 大夜" autoFocus />
                </label>
                <label>目标班次
                  <input className="input" value={toShift} onChange={(e) => setToShift(e.target.value)} placeholder="希望调至" />
                </label>
              </>
            )}
            {step === 2 && (
              <label>调班原因
                <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="家庭事由 / 倒班换休…" autoFocus />
              </label>
            )}
            <div className="bh-flow-actions">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>上一步</button>}
              {step < 2 ? (
                <button type="button" className="btn" style={{ background: accent }} disabled={step === 0 && !shiftDate.trim()} onClick={() => setStep((s) => s + 1)}>下一步</button>
              ) : (
                <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>{busy ? '提交中…' : '提交申请'}</button>
              )}
            </div>
          </div>
        </>
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>调班记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.nurse_name}</strong>
              <span className="tag">{statusLabel(t.status)}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.shift_date}：{t.from_shift} → {t.to_shift}</p>
            {t.reason && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.reason}</p>}
            {t.status === 'pending' && (
              <div className="row-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void decide(t.id, true)}>通过</button>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void decide(t.id, false)}>驳回</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
