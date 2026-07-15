import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  patient_name: string
  symptoms: string
  suggested_dept: string
  urgency: string
  note: string
  status: string
  reporter_name?: string
}

const STEPS = ['患者', '症状', '科室'] as const

export function MedTriageWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [patient, setPatient] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [dept, setDept] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high'>('normal')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#10b981'
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/med-triage/records${q}`, token)
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

  const previewDept = async () => {
    if (!token || !symptoms.trim()) return
    try {
      const data = await apiFetch<{ suggested_dept: string }>('/api/v1/med-triage/suggest-dept', token, {
        method: 'POST',
        body: JSON.stringify({ symptoms: symptoms.trim() }),
      })
      setDept(data.suggested_dept || '')
    } catch (e) {
      setMsg(`科室建议失败：${String(e)}`)
    }
  }

  const submit = async () => {
    if (!token || !symptoms.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/med-triage/records', token, {
        method: 'POST',
        body: JSON.stringify({
          patient_name: patient.trim(),
          symptoms: symptoms.trim(),
          suggested_dept: dept.trim(),
          urgency,
          note: note.trim(),
          app_public_id: appId || '',
        }),
      })
      setPatient('')
      setSymptoms('')
      setDept('')
      setUrgency('normal')
      setNote('')
      setStep(0)
      setMsg('导诊已入库；可在待办中确认完成')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const markGuided = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/med-triage/records/${id}/guided`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`确认失败：${String(e)}`)
    }
  }

  return (
    <div className="widget bh-flow-form" style={{ ['--accent' as string]: accent }}>
      <div className="bh-flow-head">
        <h3>{entrySource === 'im' ? '导诊协作' : '医疗导诊'}</h3>
        <span className="bh-flow-meta">{entrySource === 'im' ? '群消息入口' : '应用工作台'}</span>
      </div>
      <p className="muted">
        预问诊 → 推荐科室 → 完成指引
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>
      <ol className="bh-process-flow">
        <li className={showForm ? 'is-active' : 'is-done'}>① 录入</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={openCount ? 'is-active' : ''}>② 待指引{openCount ? `（${openCount}）` : ''}</li>
        <span className="arrow" aria-hidden>→</span>
        <li>③ 已完成</li>
      </ol>

      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建导诊</button>
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
              <label>患者姓名（可匿名）
                <input className="input" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="可留空" autoFocus />
              </label>
            )}
            {step === 1 && (
              <>
                <label>症状描述
                  <textarea className="input" rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="如：咳嗽发烧两天…" autoFocus />
                </label>
                <div className="row-actions">
                  <button type="button" className={urgency === 'low' ? 'btn' : 'btn btn-ghost'} style={urgency === 'low' ? { background: accent } : undefined} onClick={() => setUrgency('low')}>低</button>
                  <button type="button" className={urgency === 'normal' ? 'btn' : 'btn btn-ghost'} style={urgency === 'normal' ? { background: accent } : undefined} onClick={() => setUrgency('normal')}>普通</button>
                  <button type="button" className={urgency === 'high' ? 'btn' : 'btn btn-ghost'} style={urgency === 'high' ? { background: '#b91c1c' } : undefined} onClick={() => setUrgency('high')}>紧急</button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <label>建议科室
                  <input className="input" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="可点建议或手填" />
                </label>
                <button type="button" className="btn btn-ghost" onClick={() => void previewDept()}>根据症状建议科室</button>
                <label>备注
                  <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="过敏史、既往就诊…" />
                </label>
              </>
            )}
            <div className="bh-flow-actions">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>上一步</button>}
              {step < 2 ? (
                <button
                  type="button"
                  className="btn"
                  style={{ background: accent }}
                  disabled={step === 1 && !symptoms.trim()}
                  onClick={() => {
                    const next = step + 1
                    setStep(next)
                    if (next === 2 && !dept.trim()) void previewDept()
                  }}
                >
                  下一步
                </button>
              ) : (
                <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>{busy ? '提交中…' : '提交导诊'}</button>
              )}
            </div>
          </div>
        </>
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>导诊记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.patient_name}</strong>
              <span className="tag">{t.status === 'open' ? '待指引' : '已完成'} · {t.urgency}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.suggested_dept} · {t.reporter_name || '—'}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.symptoms}</p>
            {t.status === 'open' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void markGuided(t.id)}>确认已指引</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
