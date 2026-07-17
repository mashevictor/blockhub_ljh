import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  pet_name: string
  symptom: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'consult', l: '问诊' },
  { k: 'visit', l: '就诊' },
  { k: 'vaccine', l: '疫苗' },
]

export function PetClinicWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'consult' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#ea580c'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {CATS.map((c) => (
              <button
                key={c.k}
                type="button"
                className={(value || 'consult') === c.k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'consult') === c.k ? { background: a } : undefined}
                onClick={() => setValue(c.k)}
              >
                {c.l}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'pet_name', label: '宠物名', placeholder: '宠物名' },
      { key: 'symptom', label: '症状 / 诉求', placeholder: '症状 / 诉求' },
      { key: 'schedule_at', label: '预约时间', inputType: 'datetime-local', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/pet-clinic/records${q}`, token)
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
    if (!token || !values.pet_name?.trim() || !values.symptom?.trim()) {
      setMsg('请填写宠物名与症状')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/pet-clinic/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: values.category || 'consult',
          pet_name: values.pet_name.trim(),
          symptom: values.symptom.trim(),
          schedule_at: (values.schedule_at || '').trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'consult' })
      setResetKey((k) => k + 1)
      setMsg('已预约')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/pet-clinic/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== 'done')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="宠物就诊预约"
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
          submitLabel="预约"
        />
        <div>
          {loading && <p className="muted">加载中…</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {active.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.pet_name} · {t.symptom}
                  </strong>
                  <span className="tag">{t.status === 'open' ? '待约' : t.status === 'scheduled' ? '已预约' : t.status}</span>
                </div>
                {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
                <div className="row-actions" style={{ marginTop: 8 }}>
                  {t.status === 'open' && (
                    <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'scheduled')}>
                      确认预约
                    </button>
                  )}
                  {t.status !== 'done' && (
                    <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>
                      完成就诊
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
