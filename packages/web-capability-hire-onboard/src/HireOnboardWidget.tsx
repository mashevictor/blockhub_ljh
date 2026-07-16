import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  candidate: string
  stage: string
  owner: string
  note: string
  status: string
}

const COLUMNS = [
  { key: 'open', label: '候选人' },
  { key: 'interview', label: '面试', action: 'interview' },
  { key: 'offered', label: 'Offer', action: 'offered' },
  { key: 'joined', label: '已入职', action: 'joined' },
] as const

export function HireOnboardWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#a855f7'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'candidate', label: '候选人 / 岗位', placeholder: '如：张三 · 前端工程师' },
      { key: 'stage', label: '当前阶段（可空）', placeholder: '初筛 / 一面…', optional: true },
      { key: 'note', label: '备注（可空）', placeholder: '渠道、期望到岗…', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/hire-onboard/records${q}`, token)
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
    if (!token || !values.candidate?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/hire-onboard/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'job',
          candidate: values.candidate.trim(),
          stage: (values.stage || '').trim() || '初筛',
          owner: user?.display_name || '',
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已加入招聘板')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const moveTo = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/hire-onboard/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  return (
    <div>
      <GtgtStepComposer
        title="招聘入职"
        meta={user?.display_name || 'HR'}
        accent={accent}
        flowHint="候选人 → 阶段 → 写入数据库看板"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={resetKey}
        submitLabel="录入候选人"
      />
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))', gap: 8, overflowX: 'auto', marginTop: 12 }}>
        {COLUMNS.map((col) => {
          const colItems = items.filter((t) => t.status === col.key)
          return (
            <div key={col.key}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
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
                    <strong style={{ fontSize: 13 }}>{t.candidate}</strong>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                      {t.stage || '—'}
                      {t.owner ? ` · ${t.owner}` : ''}
                    </p>
                    <div className="row-actions" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {COLUMNS.filter((c) => 'action' in c && c.action && c.key !== t.status).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: '2px 6px' }}
                          onClick={() => void moveTo(t.id, (c as { action: string }).action)}
                        >
                          →{c.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
