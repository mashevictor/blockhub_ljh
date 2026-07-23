import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

export type LogisticsKind =
  | 'waybill_track'
  | 'warehouse_inbound'
  | 'warehouse_outbound'
  | 'fleet_dispatch'
  | 'pod_signoff'
  | 'logistics_exception'
  | 'freight_settle'
  | 'cold_chain_alert'
  | 'dock_queue'
  | 'route_task'

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
  kind: LogisticsKind
  heading: string
  accent: string
  fields: FieldDef[]
  doneLabel: string
  doneAction: 'done' | 'approve' | 'close'
}

const CONFIGS: Record<LogisticsKind, KindConfig> = {
  waybill_track: {
    kind: 'waybill_track',
    heading: '运单跟踪',
    accent: '#ca8a04',
    fields: [
      { key: 'title', label: '运单号', placeholder: 'WB/快递单号' },
      { key: 'field_a', label: '当前节点', placeholder: '揽收 / 干线 / 派送' },
      { key: 'field_b', label: '承运商/车牌', placeholder: '承运商或车牌', optional: true },
      { key: 'field_c', label: '目的地', placeholder: '城市/仓', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '更新完成',
    doneAction: 'done',
  },
  warehouse_inbound: {
    kind: 'warehouse_inbound',
    heading: '入库验收',
    accent: '#0f766e',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'purchase', label: '采购入库' },
          { value: 'return', label: '退货入库' },
          { value: 'transfer', label: '调拨入库' },
        ],
      },
      { key: 'title', label: 'ASN/货品', placeholder: '到货单号或货品名' },
      { key: 'field_b', label: '数量', placeholder: '件数/箱数', inputType: 'number' },
      { key: 'field_c', label: '库位', placeholder: '库区-货位', optional: true },
      { key: 'note', label: '破损/备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '验收上架',
    doneAction: 'approve',
  },
  warehouse_outbound: {
    kind: 'warehouse_outbound',
    heading: '出库拣配',
    accent: '#b45309',
    fields: [
      { key: 'title', label: '出库单/波次', placeholder: 'SO 或波次号' },
      { key: 'field_a', label: 'SKU/货品', placeholder: '货品编码' },
      { key: 'field_b', label: '数量', placeholder: '拣货数量', inputType: 'number' },
      { key: 'field_c', label: '承运交接', placeholder: '承运商/车牌', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '复核出库',
    doneAction: 'done',
  },
  fleet_dispatch: {
    kind: 'fleet_dispatch',
    heading: '车辆调度',
    accent: '#1d4ed8',
    fields: [
      { key: 'title', label: '任务名', placeholder: '线路或任务简述' },
      { key: 'field_a', label: '车牌', placeholder: '车牌号' },
      { key: 'field_b', label: '司机', placeholder: '司机姓名' },
      { key: 'field_c', label: '出发仓/时间', placeholder: '仓码或计划时间', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认派车',
    doneAction: 'approve',
  },
  pod_signoff: {
    kind: 'pod_signoff',
    heading: '签收确认',
    accent: '#15803d',
    fields: [
      {
        key: 'field_a',
        label: '结果',
        choices: [
          { value: 'signed', label: '妥投签收' },
          { value: 'rejected', label: '拒收' },
          { value: 'partial', label: '部分签收' },
        ],
      },
      { key: 'title', label: '运单号', placeholder: '运单/配送单号' },
      { key: 'field_b', label: '收件人', placeholder: '姓名或门店', optional: true },
      { key: 'note', label: '异常说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认 POD',
    doneAction: 'done',
  },
  logistics_exception: {
    kind: 'logistics_exception',
    heading: '异常上报',
    accent: '#b91c1c',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'delay', label: '延误' },
          { value: 'damage', label: '破损' },
          { value: 'loss', label: '丢件' },
          { value: 'hazmat', label: '危险品' },
        ],
      },
      { key: 'title', label: '关联运单/仓', placeholder: '运单号或仓码' },
      { key: 'field_b', label: '严重程度', placeholder: '高 / 中 / 低', optional: true },
      { key: 'note', label: '情况说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '结案',
    doneAction: 'close',
  },
  freight_settle: {
    kind: 'freight_settle',
    heading: '运费结算',
    accent: '#7c3aed',
    fields: [
      { key: 'title', label: '对账单/周期', placeholder: '2026-07 月结' },
      { key: 'field_a', label: '承运商', placeholder: '承运商名称' },
      { key: 'field_b', label: '金额', placeholder: '结算金额', inputType: 'number' },
      { key: 'field_c', label: '票数', placeholder: '运单票数', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认结算',
    doneAction: 'approve',
  },
  cold_chain_alert: {
    kind: 'cold_chain_alert',
    heading: '冷链告警',
    accent: '#0369a1',
    fields: [
      { key: 'title', label: '设备/车厢', placeholder: '冷机编号或车牌' },
      { key: 'field_a', label: '温度℃', placeholder: '实测温度', inputType: 'number' },
      { key: 'field_b', label: '阈值%', placeholder: '可选', inputType: 'number', optional: true },
      { key: 'field_c', label: '阈值下限', placeholder: '如 2~8℃', optional: true },
      { key: 'note', label: '处置说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '告警处置完成',
    doneAction: 'done',
  },
  dock_queue: {
    kind: 'dock_queue',
    heading: '装卸排队',
    accent: '#a16207',
    fields: [
      { key: 'title', label: '车牌/预约号', placeholder: '车牌或预约码' },
      { key: 'field_a', label: '月台', placeholder: 'Dock-01' },
      { key: 'field_b', label: '预约时段', placeholder: '14:00-15:00', optional: true },
      { key: 'field_c', label: '作业类型', placeholder: '装 / 卸', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '叫号完成',
    doneAction: 'done',
  },
  route_task: {
    kind: 'route_task',
    heading: '路线任务',
    accent: '#4338ca',
    fields: [
      { key: 'title', label: '路线名', placeholder: '城配 A 线' },
      { key: 'field_a', label: '站点顺序', placeholder: '仓→店1→店2' },
      { key: 'field_b', label: '预计里程km', placeholder: '可选', inputType: 'number', optional: true },
      { key: 'field_c', label: '车辆', placeholder: '车牌', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '任务下发完成',
    doneAction: 'approve',
  },
}

function LogisticsOpsWidget({ kind, node }: { kind: LogisticsKind; node?: SchemaNode }) {
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/logistics-ops/${kind}/records${q}`, token)
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
      await apiFetch(`/api/v1/logistics-ops/${kind}/records`, token, {
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
    await apiFetch(`/api/v1/logistics-ops/${kind}/records/${id}/${cfg.doneAction}`, token, {
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

export function WaybillTrackWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="waybill_track" node={props.node} />
}
export function WarehouseInboundWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="warehouse_inbound" node={props.node} />
}
export function WarehouseOutboundWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="warehouse_outbound" node={props.node} />
}
export function FleetDispatchWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="fleet_dispatch" node={props.node} />
}
export function PodSignoffWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="pod_signoff" node={props.node} />
}
export function LogisticsExceptionWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="logistics_exception" node={props.node} />
}
export function FreightSettleWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="freight_settle" node={props.node} />
}
export function ColdChainAlertWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="cold_chain_alert" node={props.node} />
}
export function DockQueueWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="dock_queue" node={props.node} />
}
export function RouteTaskWidget(props: { node: SchemaNode }) {
  return <LogisticsOpsWidget kind="route_task" node={props.node} />
}
