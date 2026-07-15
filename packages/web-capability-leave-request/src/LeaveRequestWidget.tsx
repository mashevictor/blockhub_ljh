import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  applicant: string
  start_at: string
  end_at: string
  note: string
  status: string
  reporter_name?: string
}

const CAT_LABEL: Record<string, string> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
}

const STATUS_LABEL: Record<string, string> = {
  open: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  done: '已归档',
}

export function LeaveRequestWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'annual' })
  const [msg, setMsg] = useState('')
  const [showDone, setShowDone] = useState(false)

  const accent = primaryColor || '#8b5cf6'
  const pending = items.filter((t) => t.status === 'open')
  const done = items.filter((t) => t.status !== 'open')

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '假种',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {([
              ['annual', '年假'],
              ['sick', '病假'],
              ['personal', '事假'],
            ] as const).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || 'annual') === k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'annual') === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'start_at', label: '开始日期', placeholder: '2026-07-20' },
      { key: 'end_at', label: '结束日期', placeholder: '2026-07-22' },
      { key: 'note', label: '事由（可空）', placeholder: '探亲 / 看病…', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/leave-request/records${q}`, token)
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
    if (!token || !values.start_at?.trim() || !values.end_at?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/leave-request/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: values.category || 'annual',
          applicant: user?.display_name || '',
          start_at: values.start_at.trim(),
          end_at: values.end_at.trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'annual' })
      setResetKey((k) => k + 1)
      setMsg('已提交审批')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/leave-request/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div>
          <GtgtStepComposer
            title="我要请假"
            meta={entrySource === 'im' ? '群消息入口' : user?.display_name || '申请人'}
            accent={accent}
            flowHint="选假种 → 填起止日期 → 交主管审"
            steps={steps}
            values={values}
            onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
            onComplete={submit}
            busy={busy}
            resetKey={resetKey}
            submitLabel="提交请假"
          />
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            待我审 {pending.length ? `· ${pending.length}` : ''}
          </h4>
          {loading && <p className="muted">加载中…</p>}
          {!loading && pending.length === 0 && <p className="muted">暂无待审批请假</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {pending.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.applicant || t.reporter_name || '同事'} · {CAT_LABEL[t.category] || t.category}
                  </strong>
                  <span className="tag">{STATUS_LABEL[t.status]}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                  {t.start_at} → {t.end_at}
                </p>
                {t.note ? <p className="muted" style={{ margin: '4px 0 0' }}>{t.note}</p> : null}
                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'approved')}>
                    通过
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'rejected')}>
                    驳回
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {done.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowDone((v) => !v)}>
                {showDone ? '收起已处理' : `已处理 ${done.length}`}
              </button>
              {showDone && (
                <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                  {done.map((t) => (
                    <li key={t.id} className="list-card" style={{ opacity: 0.85 }}>
                      <div className="list-card-head">
                        <strong>
                          {t.applicant || '同事'} · {CAT_LABEL[t.category] || t.category}
                        </strong>
                        <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
                      </div>
                      <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                        {t.start_at} → {t.end_at}
                      </p>
                      {t.status === 'approved' && (
                        <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void advance(t.id, 'done')}>
                          归档
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
