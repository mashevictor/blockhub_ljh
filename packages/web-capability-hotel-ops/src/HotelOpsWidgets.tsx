import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

export type OpsKind = 'guest_complaint' | 'food_purchase' | 'hygiene_check' | 'room_service' | 'banquet_order' | 'hotel_revenue' | 'fnb_order' | 'lost_found' | 'room_status' | 'hk_task' | 'minibar_charge' | 'concierge_req' | 'group_checkin' | 'night_audit' | 'table_reserve' | 'menu_86' | 'kitchen_waste' | 'allergen_note'

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
  inputType?: string
  choices?: Array<{ value: string; label: string }>
}

interface KindConfig {
  kind: OpsKind
  heading: string
  accent: string
  fields: FieldDef[]
  doneLabel: string
  doneAction: 'done' | 'approve' | 'close'
}

const CONFIGS: Record<OpsKind, KindConfig> = {
  guest_complaint: {
    kind: 'guest_complaint',
    heading: '客诉处理',
    accent: '#db2777',
    fields: [
      { key: 'field_a', label: '类型', choices: [{ value: 'service', label: '服务' }, { value: 'facility', label: '设施' }, { value: 'fnb', label: '餐饮' }, { value: 'other', label: '其他' }] },
      { key: 'title', label: '房号/客人' },
      { key: 'field_b', label: '紧急程度', optional: true },
      { key: 'note', label: '客诉内容', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '结案',
    doneAction: 'close',
  },
  food_purchase: {
    kind: 'food_purchase',
    heading: '食材申购',
    accent: '#ea580c',
    fields: [
      { key: 'title', label: '品名' },
      { key: 'field_a', label: '厨房/档口' },
      { key: 'field_b', label: '数量' },
      { key: 'field_c', label: '预算', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '采购确认',
    doneAction: 'approve',
  },
  hygiene_check: {
    kind: 'hygiene_check',
    heading: '卫生检查',
    accent: '#0f766e',
    fields: [
      { key: 'title', label: '区域' },
      { key: 'field_a', label: '检查项', optional: true },
      { key: 'note', label: '问题/整改', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '检查通过',
    doneAction: 'done',
  },
  room_service: {
    kind: 'room_service',
    heading: '客房服务',
    accent: '#2563eb',
    fields: [
      { key: 'title', label: '房号' },
      { key: 'field_a', label: '服务项' },
      { key: 'field_b', label: '时间', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '服务完成',
    doneAction: 'done',
  },
  banquet_order: {
    kind: 'banquet_order',
    heading: '宴会预订',
    accent: '#7c3aed',
    fields: [
      { key: 'title', label: '宴会名称' },
      { key: 'field_a', label: '日期' },
      { key: 'field_b', label: '桌数/人数', optional: true },
      { key: 'field_c', label: '预算', optional: true },
      { key: 'note', label: '需求', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '预订确认',
    doneAction: 'approve',
  },
  hotel_revenue: {
    kind: 'hotel_revenue',
    heading: '营收日报',
    accent: '#a16207',
    fields: [
      { key: 'title', label: '日期' },
      { key: 'field_a', label: '客房收入', optional: true },
      { key: 'field_b', label: '餐饮收入', optional: true },
      { key: 'field_c', label: '其他', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认归档',
    doneAction: 'done',
  },
  fnb_order: {
    kind: 'fnb_order',
    heading: '餐饮点单',
    accent: '#c026d3',
    fields: [
      { key: 'title', label: '桌号/房号' },
      { key: 'field_a', label: '菜品' },
      { key: 'field_b', label: '金额', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '出餐完成',
    doneAction: 'done',
  },
  lost_found: {
    kind: 'lost_found',
    heading: '失物招领',
    accent: '#475569',
    fields: [
      { key: 'title', label: '物品' },
      { key: 'field_a', label: '发现地点' },
      { key: 'field_b', label: '发现人', optional: true },
      { key: 'note', label: '描述', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已认领/关闭',
    doneAction: 'close',
  },
  room_status: {
    kind: 'room_status',
    heading: '房态变更',
    accent: '#0ea5e9',
    fields: [
      { key: 'title', label: '房号' },
      { key: 'field_a', label: '状态', choices: [{ value: 'clean', label: '净房' }, { value: 'dirty', label: '脏房' }, { value: 'ooo', label: '维修' }, { value: 'occ', label: '在住' }] },
      { key: 'field_b', label: '楼层', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '房态已更新',
    doneAction: 'done',
  },
  hk_task: {
    kind: 'hk_task',
    heading: '客房打扫',
    accent: '#14b8a6',
    fields: [
      { key: 'title', label: '房号' },
      { key: 'field_a', label: '优先级', choices: [{ value: 'vip', label: 'VIP' }, { value: 'checkout', label: '退房急扫' }, { value: 'stay', label: '续住' }, { value: 'normal', label: '普通' }] },
      { key: 'field_b', label: '完成节点', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '打扫完成',
    doneAction: 'done',
  },
  minibar_charge: {
    kind: 'minibar_charge',
    heading: '迷你吧计费',
    accent: '#f59e0b',
    fields: [
      { key: 'title', label: '房号' },
      { key: 'field_a', label: '品项' },
      { key: 'field_b', label: '金额' },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已入账',
    doneAction: 'done',
  },
  concierge_req: {
    kind: 'concierge_req',
    heading: '礼宾需求',
    accent: '#6366f1',
    fields: [
      { key: 'title', label: '客人/房号' },
      { key: 'field_a', label: '类型', choices: [{ value: 'car', label: '用车' }, { value: 'ticket', label: '票务' }, { value: 'luggage', label: '行李' }, { value: 'other', label: '其他' }] },
      { key: 'field_b', label: '时效', optional: true },
      { key: 'note', label: '需求说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已办结',
    doneAction: 'done',
  },
  group_checkin: {
    kind: 'group_checkin',
    heading: '团队入住',
    accent: '#0284c7',
    fields: [
      { key: 'title', label: '团名' },
      { key: 'field_a', label: '间数' },
      { key: 'field_b', label: '到店日' },
      { key: 'field_c', label: '联系人', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '入住确认',
    doneAction: 'approve',
  },
  night_audit: {
    kind: 'night_audit',
    heading: '夜审确认',
    accent: '#334155',
    fields: [
      { key: 'title', label: '营业日' },
      { key: 'field_a', label: '差异项', optional: true },
      { key: 'field_b', label: '差异金额', optional: true },
      { key: 'note', label: '说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '夜审通过',
    doneAction: 'approve',
  },
  table_reserve: {
    kind: 'table_reserve',
    heading: '餐厅订位',
    accent: '#e11d48',
    fields: [
      { key: 'title', label: '客人姓名' },
      { key: 'field_a', label: '人数' },
      { key: 'field_b', label: '时段' },
      { key: 'field_c', label: '桌型', optional: true, choices: [{ value: 'hall', label: '大厅' }, { value: 'private', label: '包厢' }, { value: 'terrace', label: '露台' }] },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已入座/取消',
    doneAction: 'done',
  },
  menu_86: {
    kind: 'menu_86',
    heading: '菜品沽清',
    accent: '#dc2626',
    fields: [
      { key: 'title', label: '菜名' },
      { key: 'field_a', label: '档口' },
      { key: 'field_b', label: '恢复预估', optional: true },
      { key: 'note', label: '原因', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已恢复/关闭',
    doneAction: 'done',
  },
  kitchen_waste: {
    kind: 'kitchen_waste',
    heading: '厨余报损',
    accent: '#92400e',
    fields: [
      { key: 'title', label: '品类' },
      { key: 'field_a', label: '重量或金额' },
      { key: 'field_b', label: '原因', optional: true, choices: [{ value: 'spoil', label: '变质' }, { value: 'prep', label: '备料过量' }, { value: 'return', label: '退菜' }, { value: 'other', label: '其他' }] },
      { key: 'note', label: '说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '报损确认',
    doneAction: 'approve',
  },
  allergen_note: {
    kind: 'allergen_note',
    heading: '过敏原工单',
    accent: '#be185d',
    fields: [
      { key: 'title', label: '桌号/房号' },
      { key: 'field_a', label: '过敏原' },
      { key: 'field_b', label: '菜品', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已告知厨房',
    doneAction: 'done',
  },
}

function OpsWidget({ kind, node }: { kind: OpsKind; node?: SchemaNode }) {
  const cfg = CONFIGS[kind]
  const { token, primaryColor, appId } = useRuntime()
  const sceneTitle = String(node?.props?.form_headline || node?.props?.scene_label || '').trim()
  const defaultCat = String(node?.props?.default_category || '').trim()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Record<string, string>>(() =>
    defaultCat ? { field_a: defaultCat } : {},
  )
  const [resetKey, setResetKey] = useState(0)
  const accent = primaryColor || cfg.accent

  useEffect(() => {
    setForm(defaultCat ? { field_a: defaultCat } : {})
    setResetKey((k) => k + 1)
    setMsg('')
  }, [defaultCat, node?.id])

  const steps: GtgtStep[] = useMemo(() => {
    return cfg.fields
      .filter((f) => !(defaultCat && f.key === 'field_a' && f.choices))
      .map((f) => ({
        key: f.key,
        label: f.label,
        placeholder: f.placeholder,
        optional: f.optional,
        inputType: f.inputType,
        ...(f.choices
          ? {
              render: ({
                value,
                setValue,
                accent: a,
              }: {
                value: string
                setValue: (v: string) => void
                accent: string
              }) => (
                <div className="row-actions">
                  {f.choices!.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={(value || '') === c.value ? 'btn' : 'btn btn-ghost'}
                      style={(value || '') === c.value ? { background: a } : undefined}
                      onClick={() => setValue(c.value)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              ),
            }
          : {}),
      }))
  }, [cfg.fields, defaultCat])

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/hotel-ops/${kind}/records${q}`, token)
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
      setMsg(`请填写${cfg.fields.find((f) => f.key === 'title')?.label || '标题'}`)
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch(`/api/v1/hotel-ops/${kind}/records`, token, {
        method: 'POST',
        body: JSON.stringify({
          title,
          field_a: form.field_a || defaultCat || '',
          field_b: form.field_b || '',
          field_c: form.field_c || '',
          field_d: form.field_d || '',
          note: form.note || '',
          app_public_id: appId || '',
        }),
      })
      setForm(defaultCat ? { field_a: defaultCat } : {})
      setResetKey((k) => k + 1)
      setMsg('已提交（真库）')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const done = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/hotel-ops/${kind}/records/${id}/${cfg.doneAction}`, token, {
      method: 'POST',
      body: '{}',
    })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <GtgtStepComposer
        title={sceneTitle || cfg.heading}
        meta="Gtgt · Soft · 真库"
        accent={accent}
        variant="soft"
        flowHint=">> 单字段推进 → 提交真库"
        steps={steps}
        values={form}
        onChange={(k, v) => setForm((s) => ({ ...s, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={resetKey}
        submitLabel="提交"
      />
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>
        待办{open.length ? ` · ${open.length}` : ''}
      </h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && open.length === 0 && <p className="muted">空库无数据</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.title}</strong>
              <span className="tag">{t.record_no}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
              {[t.field_a, t.field_b, t.field_c].filter(Boolean).join(' · ')}
            </p>
            <button
              type="button"
              className="btn"
              style={{ background: accent, marginTop: 8 }}
              onClick={() => void done(t.id)}
            >
              {cfg.doneLabel}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GuestComplaintWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="guest_complaint" node={props.node} />
}
export function FoodPurchaseWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="food_purchase" node={props.node} />
}
export function HygieneCheckWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="hygiene_check" node={props.node} />
}
export function RoomServiceWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="room_service" node={props.node} />
}
export function BanquetOrderWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="banquet_order" node={props.node} />
}
export function HotelRevenueWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="hotel_revenue" node={props.node} />
}
export function FnbOrderWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="fnb_order" node={props.node} />
}
export function LostFoundWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="lost_found" node={props.node} />
}
export function RoomStatusWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="room_status" node={props.node} />
}
export function HkTaskWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="hk_task" node={props.node} />
}
export function MinibarChargeWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="minibar_charge" node={props.node} />
}
export function ConciergeReqWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="concierge_req" node={props.node} />
}
export function GroupCheckinWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="group_checkin" node={props.node} />
}
export function NightAuditWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="night_audit" node={props.node} />
}
export function TableReserveWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="table_reserve" node={props.node} />
}
export function Menu86Widget(props: { node: SchemaNode }) {
  return <OpsWidget kind="menu_86" node={props.node} />
}
export function KitchenWasteWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="kitchen_waste" node={props.node} />
}
export function AllergenNoteWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="allergen_note" node={props.node} />
}
