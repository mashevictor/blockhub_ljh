import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

export type ReKind =
  | 'listing_publish'
  | 'rent_collection'
  | 'lease_renewal'
  | 'owner_complaint'
  | 'deco_acceptance'
  | 'sales_followup'
  | 're_contract'
  | 'viewing_feedback'
  | 'property_fee'
  | 'broker_commission'

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
  kind: ReKind
  heading: string
  accent: string
  fields: FieldDef[]
  doneLabel: string
  doneAction: 'done' | 'approve' | 'close'
}

const CONFIGS: Record<ReKind, KindConfig> = {
  listing_publish: {
    kind: 'listing_publish',
    heading: '房源上架',
    accent: '#78716c',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'sale', label: '出售' },
          { value: 'rent', label: '出租' },
        ],
      },
      { key: 'title', label: '房源标题', placeholder: '小区·户型·面积' },
      { key: 'field_b', label: '价格', placeholder: '总价或月租', optional: true },
      { key: 'field_c', label: '地址', placeholder: '小区/门牌', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '审核上架',
    doneAction: 'approve',
  },
  rent_collection: {
    kind: 'rent_collection',
    heading: '租金收缴',
    accent: '#b45309',
    fields: [
      { key: 'title', label: '租户/房源', placeholder: '姓名或房源编号' },
      { key: 'field_a', label: '账期', placeholder: '2026-07' },
      { key: 'field_b', label: '金额', placeholder: '应收金额', inputType: 'number' },
      { key: 'field_c', label: '状态', placeholder: '待催 / 已付', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认回款',
    doneAction: 'done',
  },
  lease_renewal: {
    kind: 'lease_renewal',
    heading: '租约续签',
    accent: '#0f766e',
    fields: [
      { key: 'title', label: '租户/合同号', placeholder: '租户或合同编号' },
      { key: 'field_a', label: '到期日', placeholder: 'YYYY-MM-DD', inputType: 'date' },
      { key: 'field_b', label: '新租金', placeholder: '可选', optional: true },
      { key: 'note', label: '续签说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '续签完成',
    doneAction: 'approve',
  },
  owner_complaint: {
    kind: 'owner_complaint',
    heading: '业主投诉',
    accent: '#b91c1c',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'noise', label: '噪音' },
          { value: 'leak', label: '渗漏' },
          { value: 'service', label: '服务态度' },
          { value: 'other', label: '其他' },
        ],
      },
      { key: 'title', label: '业主/房号', placeholder: '姓名或房号' },
      { key: 'field_b', label: '紧急程度', placeholder: '高 / 中 / 低', optional: true },
      { key: 'note', label: '投诉内容', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '结案',
    doneAction: 'close',
  },
  deco_acceptance: {
    kind: 'deco_acceptance',
    heading: '装修/交房验收',
    accent: '#1d4ed8',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'deco', label: '装修验收' },
          { value: 'handover', label: '交房验收' },
        ],
      },
      { key: 'title', label: '房源/工程', placeholder: '房号或工程名' },
      { key: 'field_b', label: '节点', placeholder: '水电/泥木/竣工', optional: true },
      { key: 'note', label: '问题清单', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '验收通过',
    doneAction: 'approve',
  },
  sales_followup: {
    kind: 'sales_followup',
    heading: '客户跟进',
    accent: '#7c3aed',
    fields: [
      { key: 'title', label: '客户姓名', placeholder: '意向客户' },
      { key: 'field_a', label: '意向等级', placeholder: 'A / B / C' },
      { key: 'field_b', label: '下次跟进', placeholder: '日期或方式', optional: true },
      { key: 'note', label: '跟进纪要', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '归档本轮',
    doneAction: 'done',
  },
  re_contract: {
    kind: 're_contract',
    heading: '签约认购',
    accent: '#0369a1',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'subscribe', label: '认购' },
          { value: 'sign', label: '签约' },
        ],
      },
      { key: 'title', label: '客户/房源', placeholder: '客户与房源' },
      { key: 'field_b', label: '金额', placeholder: '认购或成交价', optional: true },
      { key: 'note', label: '材料/备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认办结',
    doneAction: 'approve',
  },
  viewing_feedback: {
    kind: 'viewing_feedback',
    heading: '看房回访',
    accent: '#a16207',
    fields: [
      { key: 'title', label: '客户/房源', placeholder: '看房客户与房源' },
      { key: 'field_a', label: '意向', placeholder: '有意向 / 再看 / 放弃' },
      { key: 'field_b', label: '评分', placeholder: '1-5', optional: true },
      { key: 'note', label: '反馈', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '回访完成',
    doneAction: 'done',
  },
  property_fee: {
    kind: 'property_fee',
    heading: '物业费催缴',
    accent: '#4338ca',
    fields: [
      { key: 'title', label: '业主/房号', placeholder: '业主或房号' },
      { key: 'field_a', label: '账期', placeholder: '2026 Q2' },
      { key: 'field_b', label: '金额', placeholder: '应付金额', inputType: 'number' },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认回款',
    doneAction: 'done',
  },
  broker_commission: {
    kind: 'broker_commission',
    heading: '中介佣金',
    accent: '#15803d',
    fields: [
      { key: 'title', label: '成交单/客户', placeholder: '成交编号或客户' },
      { key: 'field_a', label: '中介', placeholder: '中介公司/经纪人' },
      { key: 'field_b', label: '佣金', placeholder: '金额', inputType: 'number' },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '确认结算',
    doneAction: 'approve',
  },
}

function ReOpsWidget({ kind, node }: { kind: ReKind; node?: SchemaNode }) {
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/realestate-ops/${kind}/records${q}`, token)
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
      await apiFetch(`/api/v1/realestate-ops/${kind}/records`, token, {
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
    await apiFetch(`/api/v1/realestate-ops/${kind}/records/${id}/${cfg.doneAction}`, token, {
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

export function ListingPublishWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="listing_publish" node={props.node} />
}
export function RentCollectionWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="rent_collection" node={props.node} />
}
export function LeaseRenewalWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="lease_renewal" node={props.node} />
}
export function OwnerComplaintWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="owner_complaint" node={props.node} />
}
export function DecoAcceptanceWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="deco_acceptance" node={props.node} />
}
export function SalesFollowupWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="sales_followup" node={props.node} />
}
export function ReContractWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="re_contract" node={props.node} />
}
export function ViewingFeedbackWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="viewing_feedback" node={props.node} />
}
export function PropertyFeeWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="property_fee" node={props.node} />
}
export function BrokerCommissionWidget(props: { node: SchemaNode }) {
  return <ReOpsWidget kind="broker_commission" node={props.node} />
}
