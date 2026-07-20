import { useCallback, useEffect, useMemo, useState } from 'react'
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
  'channel-analysis': 'capture',
}

const PIPELINE_COLS: { key: string; label: string; action?: string }[] = [
  { key: 'open', label: '新线索' },
  { key: 'following', label: '跟进中', action: 'following' },
  { key: 'won', label: '成交', action: 'won' },
  { key: 'lost', label: '丢单', action: 'lost' },
]

const ROLE_STORAGE = 'bh_sales_lead_role'

function pick(values: Record<string, string>, ...keys: string[]) {
  for (const k of keys) {
    const v = (values[k] || '').trim()
    if (v) return v
  }
  return ''
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
  const accent = primaryColor || '#6366f1'

  const [role, setRole] = useState<SalesRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE) as SalesRole | null
      if (saved && ROLE_LABEL[saved]) return saved
    } catch {
      /* ignore */
    }
    return defaultRoleForCategory(defaultCat)
  })
  const [method, setMethod] = useState<MethodTab>(() => defaultMethodForRole(defaultRoleForCategory(defaultCat), defaultCat))
  const [items, setItems] = useState<RecordItem[]>([])
  const [channels, setChannels] = useState<ChannelStat[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const m = METHOD_BY_CATEGORY[defaultCat]
    if (m) setMethod(m)
  }, [defaultCat])

  const methodTabs = useMemo(() => {
    const all: { key: MethodTab; label: string }[] = [
      { key: 'capture', label: '录入' },
      { key: 'referral', label: '转介绍' },
      { key: 'assign', label: '分配' },
      { key: 'clean', label: '清洗' },
      { key: 'pool', label: '公海' },
      { key: 'score', label: '评分' },
      { key: 'pipeline', label: '跟进成交' },
    ]
    if (role === 'sales_marketing') {
      return all.filter((t) => ['capture', 'referral', 'pipeline'].includes(t.key))
    }
    if (role === 'sales_manager') {
      return all.filter((t) => ['assign', 'clean', 'score', 'capture', 'pipeline'].includes(t.key))
    }
    return all.filter((t) => ['capture', 'referral', 'pool', 'pipeline'].includes(t.key))
  }, [role])

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
      if (role === 'sales_marketing' || method === 'capture') {
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
  }, [token, appId, role, method])

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

  const steps: GtgtStep[] = useMemo(() => {
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
        { key: 'lead_key', label: '线索', placeholder: '客户名 / 单号 / ID' },
        { key: 'assignee', label: '负责人', placeholder: '销售员姓名' },
        { key: 'note', label: '备注（可空）', placeholder: '可选', inputType: 'textarea', optional: true },
      ]
    }
    if (method === 'clean') {
      return [
        { key: 'lead_key', label: '线索', placeholder: '客户名 / 单号 / ID' },
        {
          key: 'result',
          label: '清洗结果',
          placeholder: '有效 / 无效 / 重复 / 公海',
          render: ({ value, setValue, accent }) => (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['有效', '无效', '重复', '公海'].map((opt) => (
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
        { key: 'lead_key', label: '公海线索', placeholder: '客户名 / 单号 / ID' },
        { key: 'reason', label: '领取理由（可空）', placeholder: '可选', inputType: 'textarea', optional: true },
      ]
    }
    if (method === 'score') {
      return [
        { key: 'lead_key', label: '线索', placeholder: '客户名 / 单号 / ID' },
        { key: 'score', label: '评分 1-100', placeholder: '如 80' },
        { key: 'comment', label: '说明（可空）', placeholder: '可选', inputType: 'textarea', optional: true },
      ]
    }
    return []
  }, [method])

  const formTitle = useMemo(() => {
    const map: Record<MethodTab, string> = {
      capture: '多渠道录入',
      referral: '转介绍线索',
      assign: '分配线索',
      clean: '清洗线索',
      pool: '领取公海',
      score: '线索评分',
      pipeline: '跟进成交',
    }
    return map[method]
  }, [method])

  const submit = async () => {
    if (!token) return
    setBusy(true)
    setMsg('')
    try {
      const app_public_id = appId || ''
      if (method === 'capture' || method === 'referral') {
        const customer = pick(values, 'customer', 'company_name', 'company')
        if (!customer) return
        await apiFetch('/api/v1/sales-lead/records', token, {
          method: 'POST',
          body: JSON.stringify({
            category: method === 'referral' ? 'referral-lead' : 'lead-capture',
            customer,
            amount: '',
            owner: user?.display_name || '',
            note: [pick(values, 'contact', 'contact_name'), pick(values, 'note', 'phone')].filter(Boolean).join(' · '),
            source: method === 'referral' ? '转介绍' : pick(values, 'source') || '未标注',
            referrer: pick(values, 'referrer'),
            app_public_id,
          }),
        })
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
          ? `晋级被拦：${detail}（请先到「成交证据」登记）`
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
      setMsg('已退回公海')
      await load()
    } catch (e) {
      setMsg(`退公海失败：${String(e)}`)
    }
  }

  const listHint =
    role === 'sales_rep'
      ? '我的线索 + 公海'
      : role === 'sales_manager'
        ? '待跟进全员线索'
        : '全部渠道线索'

  return (
    <div>
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
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {role === 'sales_marketing' && channels.length > 0 && method !== 'pipeline' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {channels.map((c) => (
            <div key={c.source} className="list-card" style={{ padding: 10 }}>
              <strong style={{ fontSize: 13 }}>{c.source}</strong>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {c.total} 条 · 成交 {c.won} · 转化 {(c.win_rate * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      )}

      {method !== 'pipeline' && steps.length > 0 && (
        <GtgtStepComposer
          title={formTitle}
          meta={ROLE_LABEL[role]}
          accent={accent}
          variant="soft"
          flowHint="获客方法 · >> 单字段推进"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="确认"
        />
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
                    {t.pool_status === 'pool' ? '公海' : t.pool_status || '私有'} · {t.status}
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
                  {t.pool_status === 'pool' && role === 'sales_rep' && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        setMethod('pool')
                        setValues({ lead_key: t.customer })
                        setResetKey((k) => k + 1)
                      }}
                    >
                      领取
                    </button>
                  )}
                  {role === 'sales_manager' && t.pool_status === 'private' && t.status === 'open' && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 11 }}
                      onClick={() => void releaseToPool(t.id)}
                    >
                      退公海
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
