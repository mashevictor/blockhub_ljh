import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTf } from '@blockhub/i18n/react'
import type { SchemaNode } from '@blockhub/web-core'
import {
  apiFetch,
  GtgtStepComposer,
  resolveFormSteps,
  useRuntime,
  type FormFieldDef,
  type GtgtStep,
} from '@blockhub/web-core'

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

export function LeaveRequestWidget({ node }: { node: SchemaNode }) {
  const tf = useTf()
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const defaultCat = String(node.props?.default_category || 'annual')
  const sceneLabel = String(node.props?.scene_label || '')
  const isOvertime = defaultCat === 'overtime' || sceneLabel.includes('加班')
  const isTrip = defaultCat === 'trip' || sceneLabel.includes('出差')
  const initialCat = isOvertime ? 'overtime' : isTrip ? 'trip' : defaultCat || 'annual'

  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: initialCat })
  const [msg, setMsg] = useState('')
  const [showDone, setShowDone] = useState(false)

  const accent = primaryColor || '#8b5cf6'
  const pending = items.filter((t) => t.status === 'open')
  const done = items.filter((t) => t.status !== 'open')

  const catLabel = useCallback(
    (key: string) => tf(`cap.leave_request.cat.${key}`, key),
    [tf],
  )
  const statusLabel = useCallback(
    (key: string) => tf(`cap.leave_request.status.${key}`, key),
    [tf],
  )

  const formTitle = isOvertime
    ? tf('cap.leave_request.title.overtime', '我要加班')
    : isTrip
      ? tf('cap.leave_request.title.trip', '出差申请')
      : tf('cap.leave_request.title.leave', '我要请假')
  const submitLabel = isOvertime
    ? tf('cap.leave_request.submit.overtime', '提交加班')
    : isTrip
      ? tf('cap.leave_request.submit.trip', '提交出差')
      : tf('cap.leave_request.submit.leave', '提交请假')
  const flowHint = isOvertime
    ? tf('cap.leave_request.flow.overtime', '选加班 → 填起止时间 → 交主管审')
    : isTrip
      ? tf('cap.leave_request.flow.trip', '选出差 → 填起止日期 → 交主管审')
      : tf('cap.leave_request.flow.leave', '选假种 → 填起止日期 → 交主管审')

  const catOptions = useMemo(() => {
    if (isOvertime) return [['overtime', catLabel('overtime')]] as const
    if (isTrip) return [['trip', catLabel('trip')]] as const
    return (
      [
        ['annual', catLabel('annual')],
        ['sick', catLabel('sick')],
        ['personal', catLabel('personal')],
        ['overtime', catLabel('overtime')],
        ['trip', catLabel('trip')],
      ] as const
    )
  }, [isOvertime, isTrip, catLabel])

  const steps: GtgtStep[] = useMemo(() => {
    const dateType = isOvertime ? 'datetime-local' : 'date'
    const defaults: FormFieldDef[] = [
      {
        key: 'category',
        label: isOvertime || isTrip
          ? tf('cap.leave_request.field.type', '申请类型')
          : tf('cap.leave_request.field.category', '假种'),
      },
      {
        key: 'start_at',
        label: isOvertime
          ? tf('cap.leave_request.field.start_time', '开始时间')
          : tf('cap.leave_request.field.start_date', '开始日期'),
        placeholder: isOvertime
          ? tf('cap.leave_request.field.start_time', '开始时间')
          : tf('cap.leave_request.field.start_date', '开始日期'),
        type: dateType,
      },
      {
        key: 'end_at',
        label: isOvertime
          ? tf('cap.leave_request.field.end_time', '结束时间')
          : tf('cap.leave_request.field.end_date', '结束日期'),
        placeholder: isOvertime
          ? tf('cap.leave_request.field.end_time', '结束时间')
          : tf('cap.leave_request.field.end_date', '结束日期'),
        type: dateType,
      },
      {
        key: 'note',
        label: tf('cap.leave_request.field.note', '事由（可空）'),
        placeholder: isOvertime ? '…' : '…',
        optional: true,
      },
    ]
    const resolved = resolveFormSteps({
      defaults,
      formFields: node.props?.form_fields,
      pageMockFields: (node.props?.page_mock as { fields?: unknown } | undefined)?.fields,
    })
    return resolved.map((s) => {
      if (s.key !== 'category') return s
      return {
        ...s,
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {catOptions.map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || initialCat) === k ? 'btn' : 'btn btn-ghost'}
                style={(value || initialCat) === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      }
    })
  }, [catOptions, initialCat, isOvertime, isTrip, node.props?.form_fields, node.props?.page_mock, tf])

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
          category: values.category || initialCat,
          applicant: user?.display_name || '',
          start_at: values.start_at.trim(),
          end_at: values.end_at.trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: initialCat })
      setResetKey((k) => k + 1)
      setMsg(tf('cap.leave_request.msg.submitted', '已提交审批'))
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

  const colleague = tf('cap.leave_request.colleague', '同事')

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
            title={formTitle}
            meta={
              entrySource === 'im'
                ? tf('cap.leave_request.meta.im', '群消息入口')
                : user?.display_name || tf('cap.leave_request.meta.applicant', '申请人')
            }
            accent={accent}
            flowHint={flowHint}
            steps={steps}
            values={values}
            onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
            onComplete={submit}
            busy={busy}
            resetKey={resetKey}
            submitLabel={submitLabel}
          />
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            {tf('cap.leave_request.inbox.pending', '待我审')}
            {pending.length ? ` · ${pending.length}` : ''}
          </h4>
          {loading && <p className="muted">{tf('common.loading', '加载中…')}</p>}
          {!loading && pending.length === 0 && (
            <p className="muted">{tf('cap.leave_request.inbox.empty', '暂无待审批记录')}</p>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {pending.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.applicant || t.reporter_name || colleague} · {catLabel(t.category)}
                  </strong>
                  <span className="tag">{statusLabel(t.status)}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                  {t.start_at} → {t.end_at}
                </p>
                {t.note ? <p className="muted" style={{ margin: '4px 0 0' }}>{t.note}</p> : null}
                <div className="row-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'approved')}>
                    {tf('cap.leave_request.action.approve', '通过')}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'rejected')}>
                    {tf('cap.leave_request.action.reject', '驳回')}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {done.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowDone((v) => !v)}>
                {showDone
                  ? tf('cap.leave_request.done.hide', '收起已处理')
                  : tf('cap.leave_request.done.show', `已处理 ${done.length}`, { n: done.length })}
              </button>
              {showDone && (
                <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                  {done.map((t) => (
                    <li key={t.id} className="list-card" style={{ opacity: 0.85 }}>
                      <div className="list-card-head">
                        <strong>
                          {t.applicant || colleague} · {catLabel(t.category)}
                        </strong>
                        <span className="tag">{statusLabel(t.status)}</span>
                      </div>
                      <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                        {t.start_at} → {t.end_at}
                      </p>
                      {t.status === 'approved' && (
                        <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void advance(t.id, 'done')}>
                          {tf('cap.leave_request.action.archive', '归档')}
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
