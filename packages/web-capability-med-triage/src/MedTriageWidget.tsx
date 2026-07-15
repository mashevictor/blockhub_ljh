import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

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

export function MedTriageWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ urgency: 'normal' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#10b981'
  const openCount = items.filter((t) => t.status === 'open').length

  const previewDept = useCallback(async (symptoms: string) => {
    if (!token || !symptoms.trim()) return
    try {
      const data = await apiFetch<{ suggested_dept: string }>('/api/v1/med-triage/suggest-dept', token, {
        method: 'POST',
        body: JSON.stringify({ symptoms: symptoms.trim() }),
      })
      setValues((p) => ({ ...p, dept: data.suggested_dept || '' }))
    } catch (e) {
      setMsg(`科室建议失败：${String(e)}`)
    }
  }, [token])

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'patient', label: '患者姓名', placeholder: '可留空', optional: true },
      { key: 'symptoms', label: '症状描述', placeholder: '如：咳嗽发烧两天…' },
      {
        key: 'urgency',
        label: '紧急程度',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={value === 'low' ? 'btn' : 'btn btn-ghost'} style={value === 'low' ? { background: a } : undefined} onClick={() => setValue('low')}>低</button>
            <button type="button" className={(value || 'normal') === 'normal' ? 'btn' : 'btn btn-ghost'} style={(value || 'normal') === 'normal' ? { background: a } : undefined} onClick={() => setValue('normal')}>普通</button>
            <button type="button" className={value === 'high' ? 'btn' : 'btn btn-ghost'} style={value === 'high' ? { background: '#b91c1c' } : undefined} onClick={() => setValue('high')}>紧急</button>
          </div>
        ),
      },
      {
        key: 'dept',
        label: '建议科室',
        placeholder: '可点建议或手填',
        render: ({ value, setValue, accent: a }) => (
          <div style={{ display: 'grid', gap: 8 }}>
            <input className="bh-gtgt-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="可点建议或手填" />
            <button type="button" className="btn btn-ghost" onClick={() => void previewDept(values.symptoms || '')}>根据症状建议科室</button>
          </div>
        ),
      },
      { key: 'note', label: '备注', placeholder: '过敏史、既往就诊…', optional: true },
    ],
    [previewDept, values.symptoms],
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

  const submit = async () => {
    if (!token || !values.symptoms?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/med-triage/records', token, {
        method: 'POST',
        body: JSON.stringify({
          patient_name: (values.patient || '').trim(),
          symptoms: values.symptoms.trim(),
          suggested_dept: (values.dept || '').trim(),
          urgency: values.urgency || 'normal',
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ urgency: 'normal' })
      setResetKey((k) => k + 1)
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
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建导诊</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '导诊协作' : '医疗导诊'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`预问诊 → 推荐科室 → 完成指引${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 待指引 ${openCount}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交导诊"
        />
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
