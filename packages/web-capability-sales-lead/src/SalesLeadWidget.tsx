import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

type SalesRole = 'sales_rep' | 'sales_manager' | 'sales_marketing'
type MethodTab = 'capture' | 'assign' | 'clean' | 'pool' | 'score' | 'referral' | 'pipeline'

interface RecordItem {
  id: string
  record_no: string
  category: string
  customer: string
  amount: string
  owner: string
  note: string
  status: string
  source?: string
  score?: number | null
  pool_status?: string
  referrer?: string
  reporter_name?: string
}

interface ChannelStat {
  source: string
  total: number
  open: number
  following: number
  won: number
  lost: number
  win_rate: number
}

const ROLE_LABEL: Record<SalesRole, string> = {
  sales_rep: '一线销售',
  sales_manager: '销售主管',
  sales_marketing: '市场',
}

const METHOD_BY_CATEGORY: Record<string, MethodTab> = {
  'lead-capture': 'capture',
  lead: 'capture',
  'lead-assignment': 'assign',
  'lead-cleaning': 'clean',
  'lead-pool': 'pool',
  'lead-scoring': 'score',
  'referral-lead': 'referral',
  // 渠道分析：只看聚合，不走录入表单
  'channel-analysis': 'pipeline',
}

const PIPELINE_COLS: { key: string; label: string; action?: string }[] = [
  { key: 'open', label: '新线索' },
  { key: 'following', label: '跟进中', action: 'following' },
  { key: 'won', label: '成交', action: 'won' },
  { key: 'lost', label: '丢单', action: 'lost' },
]

const ROLE_STORAGE = 'bh_sales_lead_role'

const METHOD_LABEL: Record<MethodTab, string> = {
  capture: '录入',
  referral: '转介绍',
  assign: '分配',
  clean: '清洗',
  pool: '待领取',
  score: '评分',
  pipeline: '跟进成交',
}

/** 一线：获客入口 → 待领取 → 跟进；市场无待领取 Tab */
function flowStepsForRole(role: SalesRole): { key: MethodTab; label: string; tip: string }[] {
  if (role === 'sales_marketing') {
    return [
      { key: 'capture', label: '录入', tip: '展会/投放等新建' },
      { key: 'referral', label: '转介绍', tip: '老客推荐新建' },
      { key: 'pipeline', label: '跟进成交', tip: '看漏斗推进' },
    ]
  }
  if (role === 'sales_manager') {
    return [
      { key: 'assign', label: '分配', tip: '指定负责人' },
      { key: 'clean', label: '清洗', tip: '有效/退回池' },
      { key: 'score', label: '评分', tip: '给意向打分' },
      { key: 'pipeline', label: '跟进成交', tip: '看全员漏斗' },
    ]
  }
  return [
    { key: 'capture', label: '录入', tip: '写入待领取池' },
    { key: 'referral', label: '转介绍', tip: '写入待领取池' },
    { key: 'pool', label: '待领取', tip: '认领到我名下' },
    { key: 'pipeline', label: '跟进成交', tip: '新线索→跟进→成交' },
  ]
}

function SalesFlowGuide({
  role,
  method,
  accent,
  onJump,
}: {
  role: SalesRole
  method: MethodTab
  accent: string
  onJump: (m: MethodTab) => void
}) {
  const steps = flowStepsForRole(role)
  const isRepOrMkt = role === 'sales_rep' || role === 'sales_marketing'
  const parallelNote =
    role === 'sales_manager'
      ? '主管侧是「分配 / 清洗 / 评分」管池子质量：有列表数据时点选线索即可，不必手抄单号；跟进成交看全员漏斗。'
      : '「录入」和「转介绍」是并列获客入口（不是一前一后），提交后都进同一待领取池；领完再到「跟进成交」推状态。'

  const entryKeys: MethodTab[] = isRepOrMkt ? ['capture', 'referral'] : []
  const afterKeys = steps.filter((s) => !entryKeys.includes(s.key))

  return (
    <div
      style={{
        marginBottom: 14,
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        background: 'linear-gradient(180deg, #f8fafc, #fff)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>流程与数据链路</strong>
        <span className="muted" style={{ fontSize: 11, color: '#64748b' }}>
          点节点可跳转
        </span>
      </div>

      {isRepOrMkt ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps
              .filter((s) => entryKeys.includes(s.key))
              .map((s) => {
                const on = method === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onJump(s.key)}
                    style={{
                      textAlign: 'left',
                      minWidth: 120,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: on ? `2px solid ${accent}` : '1px solid #e2e8f0',
                      background: on ? `color-mix(in srgb, ${accent} 12%, #fff)` : '#fff',
                      cursor: 'pointer',
                      color: '#0f172a',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#64748b' }}>获客入口（并列）</div>
                    <strong style={{ fontSize: 13 }}>{s.label}</strong>
                    <div style={{ fontSize: 11, color: '#475569' }}>{s.tip}</div>
                  </button>
                )
              })}
          </div>
          <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 18 }}>→</span>
          {afterKeys.map((s, i) => {
            const on = method === s.key
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onJump(s.key)}
                  style={{
                    textAlign: 'left',
                    minWidth: 120,
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: on ? `2px solid ${accent}` : '1px solid #e2e8f0',
                    background: on ? `color-mix(in srgb, ${accent} 12%, #fff)` : '#fff',
                    cursor: 'pointer',
                    color: '#0f172a',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b' }}>下一步</div>
                  <strong style={{ fontSize: 13 }}>{s.label}</strong>
                  <div style={{ fontSize: 11, color: '#475569' }}>{s.tip}</div>
                </button>
                {i < afterKeys.length - 1 ? (
                  <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 18 }}>→</span>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {steps.map((s, i) => {
            const on = method === s.key
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => onJump(s.key)}
                  style={{
                    textAlign: 'left',
                    minWidth: 108,
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: on ? `2px solid ${accent}` : '1px solid #e2e8f0',
                    background: on ? `color-mix(in srgb, ${accent} 12%, #fff)` : '#fff',
                    cursor: 'pointer',
                    color: '#0f172a',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b' }}>步骤 {i + 1}</div>
                  <strong style={{ fontSize: 13 }}>{s.label}</strong>
                  <div style={{ fontSize: 11, color: '#475569' }}>{s.tip}</div>
                </button>
                {i < steps.length - 1 ? (
                  <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 16 }}>→</span>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, color: '#334155', lineHeight: 1.55 }}>
        {role !== 'sales_manager' ? (
          <>
            <div>
              <b>同一条线索怎么变：</b>
              录入/转介绍写入 → <code>待领取</code> → 领取 → <code>已认领</code> → 跟进成交推进为{' '}
              <code>跟进中 / 成交 / 丢单</code>
            </div>
            <div style={{ color: '#64748b', marginTop: 4 }}>{parallelNote}</div>
          </>
        ) : (
          <div style={{ color: '#64748b' }}>{parallelNote}</div>
        )}
      </div>
    </div>
  )
}

function pick(values: Record<string, string>, ...keys: string[]) {
  for (const k of keys) {
    const v = (values[k] || '').trim()
    if (v) return v
  }
  return ''
}

function leadLabel(t: RecordItem) {
  const pool = t.pool_status === 'pool' ? '待领取' : t.pool_status === 'private' ? '已认领' : ''
  return `${t.customer}${pool ? ` · ${pool}` : ''}`
}

/** 分配/清洗/领取/评分：优先点选列表线索，仍保留手输兜底 */
function LeadPickField({
  value,
  setValue,
  accent,
  leads,
  emptyHint,
}: {
  value: string
  setValue: (v: string) => void
  accent: string
  leads: RecordItem[]
  emptyHint: string
}) {
  const selected = leads.find((t) => t.id === value || t.customer === value || t.record_no === value)
  return (
    <div style={{ display: 'grid', gap: 8, width: '100%' }}>
      {leads.length === 0 ? (
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          {emptyHint}
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {leads.map((t) => {
            const on = value === t.id || value === t.customer || value === t.record_no
            return (
              <button
                key={t.id}
                type="button"
                className="btn btn-ghost"
                style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  background: on ? accent : undefined,
                  color: on ? '#fff' : undefined,
                  border: on ? 'none' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  maxWidth: '100%',
                  textAlign: 'left',
                }}
                onClick={() => setValue(t.id)}
                title={`${t.record_no} · ${t.source || ''}`}
              >
                {leadLabel(t)}
              </button>
            )
          })}
        </div>
      )}
      {selected ? (
        <p className="muted" style={{ margin: 0, fontSize: 11 }}>
          已选：{selected.customer} · {selected.record_no}（也可改选手输）
        </p>
      ) : null}
      <input
        className="bh-gtgt-input"
        value={selected ? selected.customer : value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="或手输客户名 / 单号 / ID"
        style={{ fontSize: 13 }}
      />
    </div>
  )
}

function defaultRoleForCategory(cat: string): SalesRole {
  if (cat === 'lead-assignment' || cat === 'lead-cleaning' || cat === 'lead-scoring') return 'sales_manager'
  if (cat === 'channel-analysis' || cat === 'lead-capture') return 'sales_marketing'
  return 'sales_rep'
}

function defaultMethodForRole(role: SalesRole, cat: string): MethodTab {
  const fromCat = METHOD_BY_CATEGORY[cat]
  if (fromCat) return fromCat
  if (role === 'sales_manager') return 'assign'
  if (role === 'sales_marketing') return 'capture'
  return 'pool'
}

export function SalesLeadWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const defaultCat = String(node.props?.default_category || 'lead-capture')
  const sceneTitle = String(
    node.props?.form_headline || node.props?.scene_label || node.props?.label || '',
  ).trim()
  // 行业场景入口：按 default_category 锁定主方法，避免切侧栏仍停在「录入」
  const sceneLocked = Boolean(node.props?.default_category)
  const accent = primaryColor || '#6366f1'
  const channelOnly = defaultCat === 'channel-analysis'

  const [role, setRole] = useState<SalesRole>(() => defaultRoleForCategory(defaultCat))
  const [method, setMethod] = useState<MethodTab>(() =>
    defaultMethodForRole(defaultRoleForCategory(defaultCat), defaultCat),
  )
  const [items, setItems] = useState<RecordItem[]>([])
  const [channels, setChannels] = useState<ChannelStat[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const submittingRef = useRef(false)

  // 切换侧栏场景时：重置身份 + 方法，并清掉全局身份覆盖
  useEffect(() => {
    const nextRole = defaultRoleForCategory(defaultCat)
    const nextMethod = defaultMethodForRole(nextRole, defaultCat)
    setRole(nextRole)
    setMethod(nextMethod)
    setValues({})
    setResetKey((k) => k + 1)
    setMsg('')
    if (sceneLocked) {
      try {
        localStorage.removeItem(ROLE_STORAGE)
      } catch {
        /* ignore */
      }
    }
  }, [defaultCat, sceneLocked, node.id])

  const methodTabs = useMemo(() => {
    const all: { key: MethodTab; label: string }[] = [
      { key: 'capture', label: '录入' },
      { key: 'referral', label: '转介绍' },
      { key: 'assign', label: '分配' },
      { key: 'clean', label: '清洗' },
      { key: 'pool', label: '待领取' },
      { key: 'score', label: '评分' },
      { key: 'pipeline', label: '跟进成交' },
    ]
    if (sceneLocked) {
      const primary = METHOD_BY_CATEGORY[defaultCat] || method
      // 场景页：主方法 + 关联的待领取/跟进，便于看清数据链路（仍以本场景为主）
      if (channelOnly) {
        return [{ key: 'pipeline' as MethodTab, label: sceneTitle || '渠道来源分析' }]
      }
      const related = new Set<MethodTab>([primary])
      if (primary === 'capture' || primary === 'referral') {
        related.add('pool')
        related.add('pipeline')
      } else if (primary === 'pool') {
        related.add('capture')
        related.add('pipeline')
      } else if (primary === 'assign' || primary === 'clean' || primary === 'score') {
        related.add('pool')
        related.add('pipeline')
      }
      return all.filter((t) => related.has(t.key)).map((t) => ({
        ...t,
        label: t.key === primary ? sceneTitle || t.label : t.label,
      }))
    }
    if (role === 'sales_marketing') {
      return all.filter((t) => ['capture', 'referral', 'pipeline'].includes(t.key))
    }
    if (role === 'sales_manager') {
      return all.filter((t) => ['assign', 'clean', 'score', 'capture', 'pipeline'].includes(t.key))
    }
    return all.filter((t) => ['capture', 'referral', 'pool', 'pipeline'].includes(t.key))
  }, [role, sceneLocked, defaultCat, method, channelOnly, sceneTitle])

  useEffect(() => {
    if (!methodTabs.some((t) => t.key === method)) {
      setMethod(methodTabs[0]?.key || 'capture')
    }
  }, [methodTabs, method])

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setChannels([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (appId) params.set('app_id', appId)
      params.set('role', role)
      if (method === 'pool') params.set('pool_status', 'pool')
      const q = `?${params.toString()}`
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/sales-lead/records${q}`, token)
      setItems(data.items || [])
      if (role === 'sales_marketing' || method === 'capture' || channelOnly) {
        const cq = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
        const ch = await apiFetch<{ items: ChannelStat[] }>(`/api/v1/sales-lead/channel-stats${cq}`, token)
        setChannels(ch.items || [])
      } else {
        setChannels([])
      }
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setItems([])
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [token, appId, role, method, channelOnly])

  useEffect(() => {
    void load()
  }, [load])

  const onRoleChange = (r: SalesRole) => {
    setRole(r)
    try {
      localStorage.setItem(ROLE_STORAGE, r)
    } catch {
      /* ignore */
    }
    setMethod(defaultMethodForRole(r, defaultCat))
    setValues({})
    setResetKey((k) => k + 1)
  }

  const pickableLeads = useMemo(() => {
    if (method === 'pool') return items.filter((t) => t.pool_status === 'pool')
    if (method === 'assign' || method === 'clean' || method === 'score') {
      // 主管操作优先待领取；若无则展示当前列表全部，避免「有数据却选不了」
      const pool = items.filter((t) => t.pool_status === 'pool')
      return pool.length > 0 ? pool : items
    }
    return []
  }, [method, items])

  const selectLeadIntoForm = (t: RecordItem, nextMethod?: MethodTab) => {
    if (nextMethod && nextMethod !== method) setMethod(nextMethod)
    setValues((p) => ({ ...p, lead_key: t.id }))
    setResetKey((k) => k + 1)
    setMsg(`已选用「${t.customer}」，继续填下一步后点确认`)
  }

  const steps: GtgtStep[] = useMemo(() => {
    const leadStep = (label: string, emptyHint: string): GtgtStep => ({
      key: 'lead_key',
      label,
      placeholder: '点选下方线索，或手输',
      render: ({ value, setValue, accent: a }) => (
        <LeadPickField
          value={value}
          setValue={setValue}
          accent={a}
          leads={pickableLeads}
          emptyHint={emptyHint}
        />
      ),
    })

    if (method === 'capture') {
      return [
        { key: 'customer', label: '公司/客户', placeholder: '公司全称' },
        { key: 'contact', label: '联系人（可空）', placeholder: '姓名', optional: true },
        { key: 'source', label: '渠道来源', placeholder: '展会 / 官网 / 投放…' },
        { key: 'note', label: '备注（可空）', placeholder: '要点', inputType: 'textarea', optional: true },
      ]
    }
    if (method === 'referral') {
      return [
        { key: 'customer', label: '公司/客户', placeholder: '公司全称' },
        { key: 'referrer', label: '推荐人', placeholder: '老客户名称' },
        { key: 'note', label: '备注（可空）', placeholder: '可选', inputType: 'textarea', optional: true },
      ]
    }
    if (method === 'assign') {
      return [
        leadStep('线索', '暂无可分配线索：请先在「线索录入」写入（进待领取池）'),
        { key: 'assignee', label: '负责人', placeholder: '销售员姓名' },
        { key: 'note', label: '备注（可空）', placeholder: '可选', inputType: 'textarea', optional: true },
      ]
    }
    if (method === 'clean') {
      return [
        leadStep('线索', '暂无可清洗线索：先录入或从待领取池选用'),
        {
          key: 'result',
          label: '清洗结果',
          placeholder: '有效 / 无效 / 重复 / 待领取',
          render: ({ value, setValue, accent }) => (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['有效', '无效', '重复', '待领取'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    fontSize: 12,
                    background: value === opt ? accent : undefined,
                    color: value === opt ? '#fff' : undefined,
                  }}
                  onClick={() => setValue(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ),
        },
        { key: 'reason', label: '原因（可空）', placeholder: '空号 / 无需求…', inputType: 'textarea', optional: true },
      ]
    }
    if (method === 'pool') {
      return [
        leadStep('待领取线索', '暂无待领取：请先录入，或让主管退回待领取'),
        { key: 'reason', label: '领取理由（可空）', placeholder: '可选', inputType: 'textarea', optional: true },
      ]
    }
    if (method === 'score') {
      return [
        leadStep('线索', '暂无可评分线索：先录入或分配后再评'),
        { key: 'score', label: '评分 1-100', placeholder: '如 80' },
        { key: 'comment', label: '说明（可空）', placeholder: '可选', inputType: 'textarea', optional: true },
      ]
    }
    return []
  }, [method, pickableLeads])

  const formTitle = useMemo(() => {
    if (sceneTitle) return sceneTitle
    const map: Record<MethodTab, string> = {
      capture: '多渠道录入',
      referral: '转介绍线索',
      assign: '分配线索',
      clean: '清洗线索',
      pool: '领取线索',
      score: '线索评分',
      pipeline: '跟进成交',
    }
    return map[method]
  }, [method, sceneTitle])

  const submit = async () => {
    if (!token || submittingRef.current || busy) return
    submittingRef.current = true
    setBusy(true)
    setMsg('')
    try {
      const app_public_id = appId || ''
      if (method === 'capture' || method === 'referral') {
        const customer = pick(values, 'customer', 'company_name', 'company')
        if (!customer) {
          setMsg('请填写公司/客户')
          return
        }
        await apiFetch('/api/v1/sales-lead/records', token, {
          method: 'POST',
          body: JSON.stringify({
            category: method === 'referral' ? 'referral-lead' : 'lead-capture',
            customer,
            amount: '',
            owner: '',
            note: [pick(values, 'contact', 'contact_name'), pick(values, 'note', 'phone')].filter(Boolean).join(' · '),
            source: method === 'referral' ? '转介绍' : pick(values, 'source') || '未标注',
            referrer: pick(values, 'referrer'),
            pool_status: 'pool',
            app_public_id,
          }),
        })
        setMsg('已写入待领取')
        setValues({})
        setResetKey((k) => k + 1)
        // 场景锁定时勿切走主方法（否则会与 methodTabs 打架并易触发二次提交观感）
        if (sceneLocked) {
          await load()
        } else {
          setMethod('pool')
        }
        return
      } else if (method === 'assign') {
        await apiFetch('/api/v1/sales-lead/records/assign', token, {
          method: 'POST',
          body: JSON.stringify({
            lead_key: pick(values, 'lead_key', 'lead_ids', 'lead_id'),
            assignee: pick(values, 'assignee'),
            note: pick(values, 'note'),
            app_public_id,
          }),
        })
      } else if (method === 'clean') {
        await apiFetch('/api/v1/sales-lead/records/clean', token, {
          method: 'POST',
          body: JSON.stringify({
            lead_key: pick(values, 'lead_key', 'lead_id'),
            result: pick(values, 'result', 'status'),
            reason: pick(values, 'reason'),
            app_public_id,
          }),
        })
      } else if (method === 'pool') {
        await apiFetch('/api/v1/sales-lead/records/claim', token, {
          method: 'POST',
          body: JSON.stringify({
            lead_key: pick(values, 'lead_key', 'lead_id'),
            reason: pick(values, 'reason'),
            app_public_id,
          }),
        })
      } else if (method === 'score') {
        const score = Number(pick(values, 'score'))
        await apiFetch('/api/v1/sales-lead/records/score', token, {
          method: 'POST',
          body: JSON.stringify({
            lead_key: pick(values, 'lead_key', 'lead_id'),
            score,
            comment: pick(values, 'comment'),
            app_public_id,
          }),
        })
      }
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已写入真库')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  const moveTo = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/sales-lead/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      setMsg('')
      await load()
    } catch (e) {
      const detail = String(e)
      setMsg(
        action === 'following' || action === 'won'
          ? `晋级被拦：${detail} → 左侧「客户跟进 · 赢单复盘」登记证据后再点`
          : `更新失败：${detail}`,
      )
    }
  }

  const releaseToPool = async (id: string) => {
    if (!token) return
    try {
      await apiFetch('/api/v1/sales-lead/records/release', token, {
        method: 'POST',
        body: JSON.stringify({ lead_key: id, app_public_id: appId || '' }),
      })
      setMsg('已退回待领取')
      await load()
    } catch (e) {
      setMsg(`退回失败：${String(e)}`)
    }
  }

  const listHint =
    method === 'pool'
      ? '待领取线索'
      : role === 'sales_rep'
        ? '我的线索 + 待领取'
        : role === 'sales_manager'
          ? '待跟进全员线索'
          : '全部渠道线索'

  return (
    <div>
      <SalesFlowGuide
        role={role}
        method={method}
        accent={accent}
        onJump={(m) => {
          if (!methodTabs.some((t) => t.key === m)) {
            setMsg(`当前场景侧重「${METHOD_LABEL[method]}」；可点上方链路看关联步骤`)
            return
          }
          setMethod(m)
          setValues({})
          setResetKey((k) => k + 1)
          setMsg('')
        }}
      />

      {sceneLocked ? (
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#0f172a' }}>
            {sceneTitle || METHOD_LABEL[method] || '销售获客'}
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            {ROLE_LABEL[role]} · 本场景主方法「
            {METHOD_LABEL[METHOD_BY_CATEGORY[defaultCat] || method]}」
            {channelOnly ? '（渠道转化看板）' : ' · 上方为数据流转图'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            身份
          </span>
          {(Object.keys(ROLE_LABEL) as SalesRole[]).map((r) => (
            <button
              key={r}
              type="button"
              className={role === r ? 'btn' : 'btn btn-ghost'}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                background: role === r ? accent : undefined,
                color: role === r ? '#fff' : undefined,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
              onClick={() => onRoleChange(r)}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {methodTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className="btn btn-ghost"
            style={{
              fontSize: 12,
              padding: '4px 10px',
              fontWeight: method === t.key ? 700 : 400,
              borderBottom: method === t.key ? `2px solid ${accent}` : '2px solid transparent',
              borderRadius: 0,
            }}
            onClick={() => {
              setMethod(t.key)
              setValues({})
              setResetKey((k) => k + 1)
              setMsg('')
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(channelOnly || (role === 'sales_marketing' && channels.length > 0 && method !== 'pipeline')) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {channels.length === 0 && channelOnly && !loading ? (
            <p className="muted" style={{ fontSize: 13 }}>暂无渠道数据（空库空列表）</p>
          ) : (
            channels.map((c) => (
              <div key={c.source} className="list-card" style={{ padding: 10 }}>
                <strong style={{ fontSize: 13 }}>{c.source}</strong>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  {c.total} 条 · 成交 {c.won} · 转化 {(c.win_rate * 100).toFixed(0)}%
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {!channelOnly && method !== 'pipeline' && steps.length > 0 && !(method === 'pool' && !loading && items.length === 0) && (
        <GtgtStepComposer
          title={formTitle}
          meta={ROLE_LABEL[role]}
          accent={accent}
          variant="soft"
          flowHint={
            method === 'assign' || method === 'clean' || method === 'pool' || method === 'score'
              ? '点选线索卡片 → 填下一步 → 确认（有数据无需手抄单号）'
              : '获客方法 · >> 单字段推进'
          }
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="确认"
        />
      )}

      {method === 'pool' && !loading && items.length === 0 && (
        <div
          className="list-card"
          style={{
            padding: 16,
            marginBottom: 12,
            border: `1px dashed ${accent}`,
            background: 'rgba(13,71,161,0.04)',
          }}
        >
          <strong style={{ fontSize: 14 }}>暂无待领取线索</strong>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.55 }}>
            「待领取」只显示池里无人认领的线索。你之前在「录入」里写进的线索若已是「已认领」，这里不会出现。
            <br />
            请先点上方 <b>录入</b> 新建一条（会进入待领取），或让主管把线索「退回待领取」。
          </p>
          <button
            type="button"
            className="btn"
            style={{ marginTop: 12, background: accent, border: 'none', color: '#fff', fontSize: 13 }}
            onClick={() => {
              setMethod('capture')
              setValues({})
              setResetKey((k) => k + 1)
              setMsg('')
            }}
          >
            去录入（写入待领取）
          </button>
        </div>
      )}

      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}

      {method === 'pipeline' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
            gap: 10,
            overflowX: 'auto',
            marginTop: 8,
          }}
        >
          {PIPELINE_COLS.map((col) => {
            const colItems = items.filter((t) => t.status === col.key)
            return (
              <div key={col.key} style={{ minWidth: 140 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
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
                      <strong style={{ fontSize: 13 }}>{t.customer}</strong>
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                        {t.source ? `${t.source} · ` : ''}
                        {t.owner || '未分配'}
                        {t.score != null ? ` · 分${t.score}` : ''}
                      </p>
                      <div className="row-actions" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                        {PIPELINE_COLS.filter((c) => c.action && c.key !== t.status).map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: 11, padding: '2px 6px' }}
                            onClick={() => void moveTo(t.id, c.action!)}
                          >
                            →{c.label}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                  {!loading && colItems.length === 0 && (
                    <li className="muted" style={{ fontSize: 12, padding: 8 }}>
                      空
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            {listHint} · {items.length} 条
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {items.map((t) => (
              <li key={t.id} className="list-card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14 }}>{t.customer}</strong>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {t.pool_status === 'pool' ? '待领取' : t.pool_status === 'private' ? '已认领' : t.pool_status || '已认领'} · {t.status}
                  </span>
                </div>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  {t.record_no}
                  {t.source ? ` · ${t.source}` : ''}
                  {t.owner ? ` · ${t.owner}` : ''}
                  {t.score != null ? ` · 分${t.score}` : ''}
                  {t.referrer ? ` · 荐自${t.referrer}` : ''}
                </p>
                {t.note ? (
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                    {t.note.slice(0, 100)}
                  </p>
                ) : null}
                <div className="row-actions" style={{ marginTop: 8, flexWrap: 'wrap', gap: 4 }}>
                  {(method === 'assign' || method === 'clean' || method === 'score' || method === 'pool') && (
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: 11, background: accent, color: '#fff', border: 'none' }}
                      onClick={() => selectLeadIntoForm(t)}
                    >
                      {method === 'assign'
                        ? '选用并分配'
                        : method === 'clean'
                          ? '选用并清洗'
                          : method === 'score'
                            ? '选用并评分'
                            : '选用并领取'}
                    </button>
                  )}
                  {t.pool_status === 'pool' && role === 'sales_rep' && method !== 'pool' && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 11 }}
                      onClick={() => selectLeadIntoForm(t, 'pool')}
                    >
                      领取
                    </button>
                  )}
                  {t.pool_status === 'private' && t.status === 'open' && (role === 'sales_manager' || role === 'sales_rep') && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 11 }}
                      onClick={() => void releaseToPool(t.id)}
                    >
                      退回待领取
                    </button>
                  )}
                </div>
              </li>
            ))}
            {!loading && items.length === 0 && (
              <li className="muted" style={{ fontSize: 13, padding: 12 }}>
                空库 · 用上方方法写入后刷新可见
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
