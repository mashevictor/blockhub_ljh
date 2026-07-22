import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

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

const SHIFTS = ['白班', '小夜', '大夜']

type ShiftMode = 'request' | 'approve' | 'roster'

const MODE_BY_CATEGORY: Record<string, ShiftMode> = {
  'shift-request': 'request',
  'nurse-shift-conflict': 'request',
  'flexible-scheduling': 'request',
  'leave-replacement': 'request',
  'night-shift-handover': 'request',
  'shift-approve': 'approve',
  'shift-roster': 'roster',
  'shift-overview': 'roster',
  'nurse-schedule-overview': 'roster',
  'dingtalk-shift-sync': 'roster',
}

const MODE_LABEL: Record<ShiftMode, string> = {
  request: '调班申请',
  approve: '审批调班',
  roster: '排班一览',
}

function ShiftFlowGuide({
  mode,
  accent,
  onJump,
}: {
  mode: ShiftMode
  accent: string
  onJump: (m: ShiftMode) => void
}) {
  const steps: { key: ShiftMode; label: string }[] = [
    { key: 'request', label: '申请' },
    { key: 'approve', label: '审批' },
    { key: 'roster', label: '一览' },
  ]
  return (
    <div style={{ marginBottom: 14 }}>
      <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>
        排班流转 · 申请入库 → 冲突校验与审批 → 科室一览（班次合规辅助）
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

export function NurseShiftWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const defaultCat = String(node.props?.default_category || 'shift-request')
  const sceneTitle = String(
    node.props?.form_headline || node.props?.scene_label || node.props?.label || '',
  ).trim()
  const sceneLocked = Boolean(node.props?.default_category)
  const [mode, setMode] = useState<ShiftMode>(() => MODE_BY_CATEGORY[defaultCat] || 'request')
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ from_shift: '白班', to_shift: '小夜' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#be185d'

  useEffect(() => {
    setMode(MODE_BY_CATEGORY[defaultCat] || 'request')
    setValues({ from_shift: '白班', to_shift: '小夜' })
    setResetKey((k) => k + 1)
    setMsg('')
  }, [defaultCat, node.id])

  const steps: GtgtStep[] = useMemo(() => [
    { key: 'shift_date', label: '调班日期', placeholder: '2026-07-20' },
    {
      key: 'from_shift', label: '原班次',
      render: ({ value, setValue, accent: a }) => (
        <div className="row-actions">{SHIFTS.map((s) => (
          <button key={s} type="button" className={(value || '白班') === s ? 'btn' : 'btn btn-ghost'} style={(value || '白班') === s ? { background: a } : undefined} onClick={() => setValue(s)}>{s}</button>
        ))}</div>
      ),
    },
    {
      key: 'to_shift', label: '目标班次',
      render: ({ value, setValue, accent: a }) => (
        <div className="row-actions">{SHIFTS.map((s) => (
          <button key={s} type="button" className={(value || '小夜') === s ? 'btn' : 'btn btn-ghost'} style={(value || '小夜') === s ? { background: a } : undefined} onClick={() => setValue(s)}>{s}</button>
        ))}</div>
      ),
    },
    { key: 'reason', label: '事由（可空）', optional: true, placeholder: '家事 / 培训…' },
  ], [])

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/nurse-shift/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !values.shift_date?.trim()) return
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/nurse-shift/records', token, {
        method: 'POST',
        body: JSON.stringify({
          nurse_name: user?.display_name || '',
          shift_date: values.shift_date.trim(),
          from_shift: values.from_shift || '白班',
          to_shift: values.to_shift || '小夜',
          reason: (values.reason || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ from_shift: '白班', to_shift: '小夜' }); setResetKey((k) => k + 1); setMsg('已提交调班')
      await load()
      if (!sceneLocked) setMode('approve')
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/nurse-shift/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(String(e))
    }
  }

  const pending = items.filter((t) => t.status === 'pending')
  const listItems = mode === 'approve' ? pending : items

  return (
    <div>
      <ShiftFlowGuide
        mode={mode}
        accent={accent}
        onJump={(m) => {
          if (sceneLocked && MODE_BY_CATEGORY[defaultCat] && m !== MODE_BY_CATEGORY[defaultCat] && m !== 'roster') {
            // 允许从申请看审批/一览链路
            if (!(MODE_BY_CATEGORY[defaultCat] === 'request' && (m === 'approve' || m === 'roster'))) {
              setMsg(`当前场景侧重「${sceneTitle || MODE_LABEL[MODE_BY_CATEGORY[defaultCat]]}」`)
              return
            }
          }
          setMode(m)
          setMsg('')
        }}
      />

      {sceneLocked ? (
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#0f172a' }}>
            {sceneTitle || MODE_LABEL[mode]}
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            {user?.display_name || '护士'} · 本场景主方法「{MODE_LABEL[MODE_BY_CATEGORY[defaultCat] || mode]}」 · 上方为数据流转图
          </p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: mode === 'request' ? 'minmax(260px,1fr) minmax(260px,1fr)' : '1fr', gap: 16 }}>
        {mode === 'request' && (
          <GtgtStepComposer
            title={sceneTitle || '我要调班'}
            meta={user?.display_name || '护士'}
            accent={accent}
            flowHint="日期 → 原班 → 目标班 → 审批"
            steps={steps}
            values={values}
            onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
            onComplete={submit}
            busy={busy}
            resetKey={resetKey}
            submitLabel="提交调班"
          />
        )}
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            {mode === 'approve' ? `待审批${pending.length ? ` · ${pending.length}` : ''}` : mode === 'roster' ? '排班一览' : `待审批${pending.length ? ` · ${pending.length}` : ''}`}
          </h4>
          {loading && <p className="muted">加载中…</p>}
          {msg && <p className="status-msg">{msg}</p>}
          {!loading && listItems.length === 0 && <p className="muted">暂无记录</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {listItems.map((t) => (
              <li key={t.id} className="list-card">
                <strong>{t.nurse_name || t.reporter_name || '同事'} · {t.shift_date}</strong>
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.from_shift} → {t.to_shift} · {t.status}</p>
                {t.status === 'pending' && (mode === 'approve' || mode === 'request') && (
                  <div className="row-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'approve')}>通过</button>
                    <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'reject')}>驳回</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
