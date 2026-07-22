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

type TriageMode = 'intake' | 'urgent' | 'followup' | 'list'

const MODE_BY_CATEGORY: Record<string, TriageMode> = {
  'triage-intake': 'intake',
  'symptom-triage': 'intake',
  'chief-complaint-struct': 'intake',
  'allergy-collection': 'intake',
  'followup-appointment': 'intake',
  'pediatric-triage': 'intake',
  'triage-urgent': 'urgent',
  'emergency-triage': 'urgent',
  'red-flag-alert': 'urgent',
  'triage-followup': 'followup',
  'triage-todo': 'followup',
  'triage-list': 'list',
  'appointment-booking': 'intake',
}

const MODE_LABEL: Record<TriageMode, string> = {
  intake: '预问诊',
  urgent: '急诊分诊',
  followup: '确认已指引',
  list: '导诊记录',
}

function MedFlowGuide({
  mode,
  accent,
  onJump,
}: {
  mode: TriageMode
  accent: string
  onJump: (m: TriageMode) => void
}) {
  const steps: { key: TriageMode; label: string }[] = [
    { key: 'intake', label: '预问诊' },
    { key: 'urgent', label: '急诊' },
    { key: 'followup', label: '待指引' },
    { key: 'list', label: '记录' },
  ]
  return (
    <div style={{ marginBottom: 14 }}>
      <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>
        导诊流转 · AI辅助预问诊入库 → 急诊优先 → 确认已指引（仅分流，不替代诊疗）
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {steps.map((s, i) => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span className="muted" style={{ fontSize: 11 }}>→</span>}
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                fontSize: 12,
                padding: '4px 10px',
                background: mode === s.key ? accent : undefined,
                color: mode === s.key ? '#fff' : undefined,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
              onClick={() => onJump(s.key)}
            >
              {s.label}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

export function MedTriageWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const defaultCat = String(node.props?.default_category || 'triage-intake')
  const sceneTitle = String(
    node.props?.form_headline || node.props?.scene_label || node.props?.label || '',
  ).trim()
  const sceneLocked = Boolean(node.props?.default_category)
  const [mode, setMode] = useState<TriageMode>(() => MODE_BY_CATEGORY[defaultCat] || 'intake')
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({
    urgency: defaultCat === 'triage-urgent' ? 'high' : 'normal',
  })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#10b981'
  const openCount = items.filter((t) => t.status === 'open').length

  useEffect(() => {
    const next = MODE_BY_CATEGORY[defaultCat] || 'intake'
    setMode(next)
    setValues({ urgency: next === 'urgent' ? 'high' : 'normal' })
    setResetKey((k) => k + 1)
    setMsg('')
  }, [defaultCat, node.id])

  const previewDept = useCallback(async (symptoms: string) => {
    if (!token || !symptoms.trim()) return
    try {
      const data = await apiFetch<{
        suggested_dept: string
        source?: string
        ai_assisted?: boolean
        matched_keywords?: string[]
        disclaimer?: string
      }>('/api/v1/med-triage/suggest-dept', token, {
        method: 'POST',
        body: JSON.stringify({ symptoms: symptoms.trim() }),
      })
      setValues((p) => ({ ...p, dept: data.suggested_dept || '' }))
      const src = data.ai_assisted ? 'AI+规则' : '规则引擎'
      const kw = (data.matched_keywords || []).slice(0, 4).join('、')
      setMsg(
        `科室建议（${src}）：${data.suggested_dept || '—'}`
          + (kw ? ` · 命中：${kw}` : '')
          + ` · ${data.disclaimer || '仅供导诊参考，不构成诊疗建议'}`,
      )
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
        render: ({ value, setValue }) => (
          <div style={{ display: 'grid', gap: 8 }}>
            <input className="bh-gtgt-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="可点建议或手填" />
            <button type="button" className="btn btn-ghost" onClick={() => void previewDept(values.symptoms || '')}>AI 辅助建议科室</button>
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
          urgency: values.urgency || (mode === 'urgent' ? 'high' : 'normal'),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ urgency: mode === 'urgent' ? 'high' : 'normal' })
      setResetKey((k) => k + 1)
      setMsg('导诊已入库；可在待办中确认完成')
      await load()
      if (!sceneLocked) setMode('followup')
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

  const listItems = mode === 'followup' ? items.filter((t) => t.status === 'open') : items
  const formModes: TriageMode[] = ['intake', 'urgent']
  const showComposer = showForm && formModes.includes(mode)

  return (
    <div>
      <MedFlowGuide
        mode={mode}
        accent={accent}
        onJump={(m) => {
          if (sceneLocked && MODE_BY_CATEGORY[defaultCat] && m !== MODE_BY_CATEGORY[defaultCat] && m !== 'followup' && m !== 'list') {
            setMsg(`当前场景侧重「${sceneTitle || MODE_LABEL[MODE_BY_CATEGORY[defaultCat]]}」；可点待指引/记录查看链路`)
            return
          }
          setMode(m)
          setValues({ urgency: m === 'urgent' ? 'high' : 'normal' })
          setResetKey((k) => k + 1)
          setMsg('')
        }}
      />

      {sceneLocked ? (
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#0f172a' }}>
            {sceneTitle || MODE_LABEL[mode]}
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            本场景主方法「{MODE_LABEL[MODE_BY_CATEGORY[defaultCat] || mode]}」
            {openCount ? ` · 待指引 ${openCount}` : ''} · 上方为数据流转图
          </p>
        </div>
      ) : null}

      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建导诊</button>
      ) : showComposer ? (
        <GtgtStepComposer
          title={sceneTitle || (mode === 'urgent' ? '急诊分诊' : entrySource === 'im' ? '导诊协作' : '医疗导诊')}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`AI辅助预问诊 → 推荐科室 → 完成指引（不替代诊疗）${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 待指引 ${openCount}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel={mode === 'urgent' ? '提交急诊分诊' : '提交导诊'}
        />
      ) : null}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>
        {mode === 'followup' ? '待指引' : '导诊记录'}
        {mode === 'followup' && openCount ? ` · ${openCount}` : ''}
      </h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && listItems.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {listItems.map((t) => (
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
