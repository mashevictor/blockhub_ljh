import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

export type OpsKind = 'stock_alert' | 'retail_order' | 'return_exchange' | 'supplier_recon' | 'price_change' | 'display_check' | 'shelf_replenish' | 'pos_exception' | 'store_transfer' | 'loss_shrinkage' | 'omni_pickup' | 'promo_coupon' | 'gift_card' | 'competitor_price' | 'new_sku_launch' | 'vip_hold' | 'receipt_audit' | 'online_refund'

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
  stock_alert: {
    kind: 'stock_alert',
    heading: '库存预警',
    accent: '#ea580c',
    fields: [
      { key: 'title', label: 'SKU/品名' },
      { key: 'field_a', label: '门店/仓' },
      { key: 'field_b', label: '当前库存', optional: true },
      { key: 'field_c', label: '安全库存', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已补货',
    doneAction: 'done',
  },
  retail_order: {
    kind: 'retail_order',
    heading: '订单跟踪',
    accent: '#c2410c',
    fields: [
      { key: 'title', label: '订单号' },
      { key: 'field_a', label: '渠道', choices: [{ value: 'online', label: '线上' }, { value: 'store', label: '门店' }, { value: 'omni', label: '全渠道' }] },
      { key: 'field_b', label: '状态', optional: true },
      { key: 'field_c', label: '金额', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '履约完成',
    doneAction: 'done',
  },
  return_exchange: {
    kind: 'return_exchange',
    heading: '退换货',
    accent: '#b91c1c',
    fields: [
      { key: 'field_a', label: '类型', choices: [{ value: 'return', label: '退货' }, { value: 'exchange', label: '换货' }] },
      { key: 'title', label: '订单/客户' },
      { key: 'field_b', label: '原因', optional: true },
      { key: 'note', label: '说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '结案',
    doneAction: 'close',
  },
  supplier_recon: {
    kind: 'supplier_recon',
    heading: '供应商对账',
    accent: '#a16207',
    fields: [
      { key: 'title', label: '供应商' },
      { key: 'field_a', label: '账期' },
      { key: 'field_b', label: '差异金额', optional: true },
      { key: 'note', label: '差异说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '对账确认',
    doneAction: 'approve',
  },
  price_change: {
    kind: 'price_change',
    heading: '价格变更',
    accent: '#7c3aed',
    fields: [
      { key: 'title', label: 'SKU/品名' },
      { key: 'field_a', label: '原价', optional: true },
      { key: 'field_b', label: '新价' },
      { key: 'field_c', label: '生效日', optional: true },
      { key: 'note', label: '原因', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '生效确认',
    doneAction: 'approve',
  },
  display_check: {
    kind: 'display_check',
    heading: '陈列检查',
    accent: '#0f766e',
    fields: [
      { key: 'title', label: '门店/货架' },
      { key: 'field_a', label: '标准项', optional: true },
      { key: 'note', label: '问题描述', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '检查通过',
    doneAction: 'done',
  },
  shelf_replenish: {
    kind: 'shelf_replenish',
    heading: '补货上架',
    accent: '#0369a1',
    fields: [
      { key: 'title', label: 'SKU/品名' },
      { key: 'field_a', label: '门店' },
      { key: 'field_b', label: '补货量', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '上架完成',
    doneAction: 'done',
  },
  pos_exception: {
    kind: 'pos_exception',
    heading: '收银异常',
    accent: '#be123c',
    fields: [
      { key: 'title', label: '门店/收银机' },
      { key: 'field_a', label: '异常类型', choices: [{ value: 'cash', label: '长短款' }, { value: 'void', label: '作废异常' }, { value: 'other', label: '其他' }] },
      { key: 'field_b', label: '金额', optional: true },
      { key: 'note', label: '说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '异常关闭',
    doneAction: 'close',
  },
  store_transfer: {
    kind: 'store_transfer',
    heading: '门店调拨',
    accent: '#b45309',
    fields: [
      { key: 'title', label: 'SKU/品名' },
      { key: 'field_a', label: '调出门店' },
      { key: 'field_b', label: '调入门店' },
      { key: 'field_c', label: '数量' },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '调拨完成',
    doneAction: 'done',
  },
  loss_shrinkage: {
    kind: 'loss_shrinkage',
    heading: '损耗报损',
    accent: '#991b1b',
    fields: [
      { key: 'title', label: 'SKU/品名' },
      { key: 'field_a', label: '原因', choices: [{ value: 'expire', label: '过期' }, { value: 'damage', label: '破损' }, { value: 'theft', label: '盗损' }, { value: 'other', label: '其他' }] },
      { key: 'field_b', label: '金额', optional: true },
      { key: 'field_c', label: '门店', optional: true },
      { key: 'note', label: '说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '报损确认',
    doneAction: 'approve',
  },
  omni_pickup: {
    kind: 'omni_pickup',
    heading: '全渠道自提',
    accent: '#ea580c',
    fields: [
      { key: 'title', label: '提货码/订单号' },
      { key: 'field_a', label: '渠道', choices: [{ value: 'app', label: 'App' }, { value: 'wechat', label: '企微/小程序' }, { value: 'douyin', label: '抖音' }] },
      { key: 'field_b', label: '到店时段', optional: true },
      { key: 'field_c', label: '门店' },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已提货',
    doneAction: 'done',
  },
  promo_coupon: {
    kind: 'promo_coupon',
    heading: '优惠券核销',
    accent: '#db2777',
    fields: [
      { key: 'title', label: '券码' },
      { key: 'field_a', label: '活动名' },
      { key: 'field_b', label: '核销门店' },
      { key: 'field_c', label: '面额', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已核销',
    doneAction: 'done',
  },
  gift_card: {
    kind: 'gift_card',
    heading: '储值卡充值',
    accent: '#ca8a04',
    fields: [
      { key: 'title', label: '卡号' },
      { key: 'field_a', label: '金额' },
      { key: 'field_b', label: '渠道', optional: true, choices: [{ value: 'store', label: '门店' }, { value: 'online', label: '线上' }, { value: 'corp', label: '企业采购' }] },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '充值完成',
    doneAction: 'done',
  },
  competitor_price: {
    kind: 'competitor_price',
    heading: '竞品采价',
    accent: '#475569',
    fields: [
      { key: 'title', label: '本品SKU' },
      { key: 'field_a', label: '竞品名' },
      { key: 'field_b', label: '竞品售价' },
      { key: 'field_c', label: '本品价', optional: true },
      { key: 'note', label: '门店/渠道', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '采价归档',
    doneAction: 'done',
  },
  new_sku_launch: {
    kind: 'new_sku_launch',
    heading: '新品上架',
    accent: '#7c3aed',
    fields: [
      { key: 'title', label: '新品名称' },
      { key: 'field_a', label: '品类' },
      { key: 'field_b', label: '上架日', optional: true },
      { key: 'field_c', label: '主推门店', optional: true },
      { key: 'note', label: '卖点', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '上架确认',
    doneAction: 'approve',
  },
  vip_hold: {
    kind: 'vip_hold',
    heading: '会员预留',
    accent: '#0891b2',
    fields: [
      { key: 'title', label: '会员号/手机' },
      { key: 'field_a', label: 'SKU/品名' },
      { key: 'field_b', label: '预留时段', optional: true },
      { key: 'field_c', label: '门店' },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '已交付',
    doneAction: 'done',
  },
  receipt_audit: {
    kind: 'receipt_audit',
    heading: '小票稽核',
    accent: '#b91c1c',
    fields: [
      { key: 'title', label: '小票号' },
      { key: 'field_a', label: '异常类型', choices: [{ value: 'discount', label: '折扣异常' }, { value: 'void', label: '作废' }, { value: 'split', label: '拆单' }, { value: 'other', label: '其他' }] },
      { key: 'field_b', label: '差额', optional: true },
      { key: 'field_c', label: '门店', optional: true },
      { key: 'note', label: '说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '稽核结案',
    doneAction: 'close',
  },
  online_refund: {
    kind: 'online_refund',
    heading: '电商仅退款',
    accent: '#c026d3',
    fields: [
      { key: 'title', label: '平台单号' },
      { key: 'field_a', label: '平台', choices: [{ value: 'tmall', label: '天猫' }, { value: 'jd', label: '京东' }, { value: 'pdd', label: '拼多多' }, { value: 'other', label: '其他' }] },
      { key: 'field_b', label: '退款原因', optional: true },
      { key: 'field_c', label: '金额' },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '退款确认',
    doneAction: 'approve',
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/retail-ops/${kind}/records${q}`, token)
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
      await apiFetch(`/api/v1/retail-ops/${kind}/records`, token, {
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
    await apiFetch(`/api/v1/retail-ops/${kind}/records/${id}/${cfg.doneAction}`, token, {
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

export function StockAlertWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="stock_alert" node={props.node} />
}
export function RetailOrderWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="retail_order" node={props.node} />
}
export function ReturnExchangeWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="return_exchange" node={props.node} />
}
export function SupplierReconWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="supplier_recon" node={props.node} />
}
export function PriceChangeWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="price_change" node={props.node} />
}
export function DisplayCheckWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="display_check" node={props.node} />
}
export function ShelfReplenishWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="shelf_replenish" node={props.node} />
}
export function PosExceptionWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="pos_exception" node={props.node} />
}
export function StoreTransferWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="store_transfer" node={props.node} />
}
export function LossShrinkageWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="loss_shrinkage" node={props.node} />
}
export function OmniPickupWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="omni_pickup" node={props.node} />
}
export function PromoCouponWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="promo_coupon" node={props.node} />
}
export function GiftCardWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="gift_card" node={props.node} />
}
export function CompetitorPriceWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="competitor_price" node={props.node} />
}
export function NewSkuLaunchWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="new_sku_launch" node={props.node} />
}
export function VipHoldWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="vip_hold" node={props.node} />
}
export function ReceiptAuditWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="receipt_audit" node={props.node} />
}
export function OnlineRefundWidget(props: { node: SchemaNode }) {
  return <OpsWidget kind="online_refund" node={props.node} />
}
