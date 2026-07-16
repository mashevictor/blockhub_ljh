import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

export type MfgKind =
  | 'mfg_oee'
  | 'material_issue'
  | 'maintenance_plan'
  | 'shift_attendance'
  | 'energy_carbon'
  | 'training_record'

interface RecordItem {
  id: string
  record_no: string
  title: string
  field_a: string
  field_b: string
  field_c: string
  field_d: string
  note: string
  status: string
}

interface FieldDef {
  key: 'title' | 'field_a' | 'field_b' | 'field_c' | 'field_d' | 'note'
  label: string
  placeholder?: string
  optional?: boolean
}

interface KindConfig {
  kind: MfgKind
  heading: string
  accent: string
  fields: FieldDef[]
  doneLabel: string
}

const CONFIGS: Record<MfgKind, KindConfig> = {
  mfg_oee: {
    kind: 'mfg_oee',
    heading: '生产日报 / OEE',
    accent: '#1d4ed8',
    fields: [
      { key: 'title', label: '产线 / 班组', placeholder: 'A3 冲压线 · 白班' },
      { key: 'field_a', label: 'OEE %', placeholder: '78.4' },
      { key: 'field_b', label: '产量（件）', placeholder: '12480' },
      { key: 'field_c', label: '停机（分钟）', placeholder: '46' },
      { key: 'note', label: '备注', optional: true },
    ],
    doneLabel: '归档日报',
  },
  material_issue: {
    kind: 'material_issue',
    heading: '物料领退料',
    accent: '#b45309',
    fields: [
      { key: 'title', label: '物料名称/编码', placeholder: '轴承 6205' },
      { key: 'field_a', label: '数量', placeholder: '40' },
      { key: 'field_b', label: '产线工位', placeholder: 'A3-07' },
      { key: 'field_c', label: '类型', placeholder: '领料 / 退料' },
      { key: 'note', label: '用途说明', optional: true },
    ],
    doneLabel: '审批通过并出库',
  },
  maintenance_plan: {
    kind: 'maintenance_plan',
    heading: '保养计划提醒',
    accent: '#0f766e',
    fields: [
      { key: 'title', label: '设备', placeholder: '注塑机 #2' },
      { key: 'field_a', label: '到期日', placeholder: '2026-07-18' },
      { key: 'field_b', label: '优先级', placeholder: '高 / 中 / 低' },
      { key: 'field_c', label: '保养项目', placeholder: '液压油更换' },
      { key: 'note', label: '备注', optional: true },
    ],
    doneLabel: '标记已保养',
  },
  shift_attendance: {
    kind: 'shift_attendance',
    heading: '排班 / 考勤',
    accent: '#7c3aed',
    fields: [
      { key: 'title', label: '员工', placeholder: '李强' },
      { key: 'field_a', label: '日期', placeholder: '2026-07-16' },
      { key: 'field_b', label: '班次', placeholder: '白班 / 夜班' },
      { key: 'field_c', label: '类型', placeholder: '排班 / 申诉' },
      { key: 'note', label: '说明', optional: true },
    ],
    doneLabel: '确认归档',
  },
  energy_carbon: {
    kind: 'energy_carbon',
    heading: '能耗 / 碳排',
    accent: '#15803d',
    fields: [
      { key: 'title', label: '指标', placeholder: '车间电耗' },
      { key: 'field_a', label: '周期', placeholder: '本周' },
      { key: 'field_b', label: '数值', placeholder: '18.2' },
      { key: 'field_c', label: '单位', placeholder: 'MWh' },
      { key: 'note', label: '备注', optional: true },
    ],
    doneLabel: '确认入库',
  },
  training_record: {
    kind: 'training_record',
    heading: '技能培训记录',
    accent: '#0369a1',
    fields: [
      { key: 'title', label: '学员', placeholder: '王敏' },
      { key: 'field_a', label: '证书/课程', placeholder: '冲压上岗证' },
      { key: 'field_b', label: '有效期', placeholder: '2027-03-01' },
      { key: 'field_c', label: '状态', placeholder: '有效 / 待考试' },
      { key: 'note', label: '备注', optional: true },
    ],
    doneLabel: '归档档案',
  },
}

function MfgOpsWidget({ kind }: { kind: MfgKind }) {
  const cfg = CONFIGS[kind]
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const accent = primaryColor || cfg.accent

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/mfg-ops/${kind}/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId, kind])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token) return
    const title = (form.title || '').trim()
    if (!title) {
      setMsg(`请填写${cfg.fields[0]?.label || '标题'}`)
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch(`/api/v1/mfg-ops/${kind}/records`, token, {
        method: 'POST',
        body: JSON.stringify({
          title,
          field_a: form.field_a || '',
          field_b: form.field_b || '',
          field_c: form.field_c || '',
          field_d: form.field_d || '',
          note: form.note || '',
          app_public_id: appId || '',
        }),
      })
      setForm({})
      setMsg('已提交')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const done = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/mfg-ops/${kind}/records/${id}/done`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>{cfg.heading}</h4>
      {cfg.fields.map((f) => (
        <label key={f.key} style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
          {f.label}
          {f.key === 'note' ? (
            <textarea
              className="input"
              style={{ width: '100%', marginTop: 4 }}
              rows={2}
              placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          ) : (
            <input
              className="input"
              style={{ width: '100%', marginTop: 4 }}
              placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          )}
        </label>
      ))}
      <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>
        提交
      </button>
      {msg ? <p className="status-msg">{msg}</p> : null}
      <h4 style={{ margin: '18px 0 8px', fontSize: 14 }}>在办列表</h4>
      {loading ? <p className="muted">加载中…</p> : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>
                {t.record_no} · {t.title}
              </strong>
              <span className="tag">{t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0', fontSize: 12 }}>
              {[t.field_a, t.field_b, t.field_c].filter(Boolean).join(' · ')}
            </p>
            <button type="button" className="btn" style={{ background: accent }} onClick={() => void done(t.id)}>
              {cfg.doneLabel}
            </button>
          </li>
        ))}
        {!loading && open.length === 0 ? <p className="muted">暂无在办记录</p> : null}
      </ul>
    </div>
  )
}

export function MfgOeeWidget(_props: { node: SchemaNode }) {
  return <MfgOpsWidget kind="mfg_oee" />
}
export function MaterialIssueWidget(_props: { node: SchemaNode }) {
  return <MfgOpsWidget kind="material_issue" />
}
export function MaintenancePlanWidget(_props: { node: SchemaNode }) {
  return <MfgOpsWidget kind="maintenance_plan" />
}
export function ShiftAttendanceWidget(_props: { node: SchemaNode }) {
  return <MfgOpsWidget kind="shift_attendance" />
}
export function EnergyCarbonWidget(_props: { node: SchemaNode }) {
  return <MfgOpsWidget kind="energy_carbon" />
}
export function TrainingRecordWidget(_props: { node: SchemaNode }) {
  return <MfgOpsWidget kind="training_record" />
}
