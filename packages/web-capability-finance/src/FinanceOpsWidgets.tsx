import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

export type FinanceKind =
  | 'finance_kyc'
  | 'finance_aml'
  | 'credit_approval'
  | 'due_diligence'
  | 'regulatory_report'
  | 'insurance_case'

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
  kind: FinanceKind
  heading: string
  accent: string
  fields: FieldDef[]
  doneLabel: string
  doneAction: 'done' | 'approve' | 'close'
}

const CONFIGS: Record<FinanceKind, KindConfig> = {
  finance_kyc: {
    kind: 'finance_kyc',
    heading: '金融 KYC',
    accent: '#0369a1',
    fields: [
      {
        key: 'field_a',
        label: '业务类型',
        choices: [
          { value: 'corporate', label: '对公' },
          { value: 'retail', label: '零售' },
          { value: 'suitability', label: '适当性' },
        ],
      },
      { key: 'title', label: '客户名称', placeholder: '企业全称 / 自然人姓名' },
      { key: 'field_b', label: '证件号/统一信用代码', placeholder: '证件号码' },
      { key: 'field_c', label: '核验要点', placeholder: '受益所有人 / 风险等级', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '核验通过',
    doneAction: 'approve',
  },
  finance_aml: {
    kind: 'finance_aml',
    heading: '反洗钱 / 风控预警',
    accent: '#b91c1c',
    fields: [
      { key: 'title', label: '预警标题', placeholder: '可疑交易 / 欺诈信号' },
      { key: 'field_a', label: '风险等级', placeholder: '高 / 中 / 低' },
      { key: 'field_b', label: '客户或账户', placeholder: '客户号 / 卡号掩码' },
      { key: 'field_c', label: '规则命中', placeholder: '大额拆分 / 异地刷卡', optional: true },
      { key: 'note', label: '研判说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '结案归档',
    doneAction: 'done',
  },
  credit_approval: {
    kind: 'credit_approval',
    heading: '授信 / 贷后',
    accent: '#1d4ed8',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'credit', label: '授信审批' },
          { value: 'post_loan', label: '贷后检查' },
        ],
      },
      { key: 'title', label: '借款人/产品', placeholder: '客户名 · 产品名' },
      { key: 'field_b', label: '申请额度', placeholder: '万元' },
      { key: 'field_c', label: '担保方式', placeholder: '抵押 / 保证 / 信用', optional: true },
      { key: 'note', label: '审批意见', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '审批通过',
    doneAction: 'approve',
  },
  due_diligence: {
    kind: 'due_diligence',
    heading: '尽调 / 投后',
    accent: '#0e7490',
    fields: [
      {
        key: 'field_a',
        label: '阶段',
        choices: [
          { value: 'research', label: '投研尽调' },
          { value: 'post_invest', label: '投后管理' },
        ],
      },
      { key: 'title', label: '标的/项目', placeholder: '公司或项目名称' },
      { key: 'field_b', label: '行业', placeholder: '行业标签', optional: true },
      { key: 'field_c', label: '尽调结论', placeholder: '通过 / 关注 / 否决', optional: true },
      { key: 'note', label: '要点纪要', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '归档报告',
    doneAction: 'done',
  },
  regulatory_report: {
    kind: 'regulatory_report',
    heading: '监管报送',
    accent: '#4338ca',
    fields: [
      { key: 'title', label: '报表名称', placeholder: '报送表名 / 监管口径' },
      { key: 'field_a', label: '报送周期', placeholder: '日 / 周 / 月 / 季' },
      { key: 'field_b', label: '截止日', placeholder: 'YYYY-MM-DD', inputType: 'date', optional: true },
      { key: 'field_c', label: '责任人', placeholder: '报送人', optional: true },
      { key: 'note', label: '备注', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '标记已报送',
    doneAction: 'done',
  },
  insurance_case: {
    kind: 'insurance_case',
    heading: '核保 / 理赔',
    accent: '#0284c7',
    fields: [
      {
        key: 'field_a',
        label: '类型',
        choices: [
          { value: 'underwrite', label: '核保' },
          { value: 'claim', label: '理赔' },
        ],
      },
      { key: 'title', label: '保单/客户', placeholder: '保单号或投保人' },
      { key: 'field_b', label: '险种', placeholder: '重疾 / 车险 / 企财' },
      { key: 'field_c', label: '金额', placeholder: '保额或赔付金额', optional: true },
      { key: 'note', label: '说明', optional: true, inputType: 'textarea' },
    ],
    doneLabel: '办结',
    doneAction: 'close',
  },
}

function FinanceOpsWidget({
  kind,
  node,
}: {
  kind: FinanceKind
  node?: SchemaNode
}) {
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/finance-ops/${kind}/records${q}`, token)
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
      await apiFetch(`/api/v1/finance-ops/${kind}/records`, token, {
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
    await apiFetch(`/api/v1/finance-ops/${kind}/records/${id}/${cfg.doneAction}`, token, {
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

export function FinanceKycWidget(props: { node: SchemaNode }) {
  return <FinanceOpsWidget kind="finance_kyc" node={props.node} />
}
export function FinanceAmlWidget(props: { node: SchemaNode }) {
  return <FinanceOpsWidget kind="finance_aml" node={props.node} />
}
export function CreditApprovalWidget(props: { node: SchemaNode }) {
  return <FinanceOpsWidget kind="credit_approval" node={props.node} />
}
export function DueDiligenceWidget(props: { node: SchemaNode }) {
  return <FinanceOpsWidget kind="due_diligence" node={props.node} />
}
export function RegulatoryReportWidget(props: { node: SchemaNode }) {
  return <FinanceOpsWidget kind="regulatory_report" node={props.node} />
}
export function InsuranceCaseWidget(props: { node: SchemaNode }) {
  return <FinanceOpsWidget kind="insurance_case" node={props.node} />
}
