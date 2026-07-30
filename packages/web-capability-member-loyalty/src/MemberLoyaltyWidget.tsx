import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTf } from '@blockhub/i18n/react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

type Mode = 'member' | 'campaign' | 'points' | 'outreach'

interface Member {
  id: string
  name: string
  phone: string
  points: number
  status: string
  last_visit_at?: string
}

interface Campaign {
  id: string
  name: string
  campaign_type: string
  rule_text: string
  points_delta: number
  status: string
}

interface Txn {
  id: string
  member_name: string
  txn_type: string
  points: number
  reason: string
}

interface Outreach {
  id: string
  member_name: string
  campaign_name: string
  message: string
  status: string
}

export function MemberLoyaltyWidget(_props: { node: SchemaNode }) {
  const tf = useTf()
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const accent = primaryColor || '#fb923c'
  const statusWord = useCallback(
    (sleeping: boolean) =>
      sleeping
        ? tf('cap.member_loyalty.status.sleeping', '沉睡')
        : tf('cap.member_loyalty.status.active', '活跃'),
    [tf],
  )
  const [mode, setMode] = useState<Mode>('member')
  const [members, setMembers] = useState<Member[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [txns, setTxns] = useState<Txn[]>([])
  const [outreaches, setOutreaches] = useState<Outreach[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [filterSleeping, setFilterSleeping] = useState(false)

  const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''

  const load = useCallback(async () => {
    if (!token) return
    try {
      const statusQ = filterSleeping ? `${q ? `${q}&` : '?'}status=sleeping` : q
      const [m, c, t, o] = await Promise.all([
        apiFetch<{ items: Member[] }>(`/api/v1/member-loyalty/members${statusQ}`, token),
        apiFetch<{ items: Campaign[] }>(`/api/v1/member-loyalty/campaigns${q}`, token),
        apiFetch<{ items: Txn[] }>(`/api/v1/member-loyalty/point-txns${q}`, token),
        apiFetch<{ items: Outreach[] }>(`/api/v1/member-loyalty/outreaches${q}`, token),
      ])
      setMembers(m.items || [])
      setCampaigns(c.items || [])
      setTxns(t.items || [])
      setOutreaches(o.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
    }
  }, [token, appId, q, filterSleeping])

  useEffect(() => {
    void load()
  }, [load])

  const steps: GtgtStep[] = useMemo(() => {
    if (mode === 'member') {
      return [
        { key: 'name', label: tf('cap.member_loyalty.field.name', '会员姓名'), placeholder: '张三' },
        { key: 'phone', label: tf('cap.member_loyalty.field.phone', '手机号'), placeholder: '可选', optional: true },
        { key: 'points', label: tf('cap.member_loyalty.field.points', '初始积分'), placeholder: '0', optional: true },
      ]
    }
    if (mode === 'campaign') {
      return [
        { key: 'name', label: tf('cap.member_loyalty.field.campaign_name', '活动名称'), placeholder: '暑期双倍积分' },
        {
          key: 'campaign_type',
          label: tf('cap.member_loyalty.field.campaign_type', '活动类型'),
          render: ({ value, setValue, accent: a }) => (
            <div className="row-actions">
              {(['points', 'redeem', 'wake'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={(value || 'points') === t ? 'btn' : 'btn btn-ghost'}
                  style={(value || 'points') === t ? { background: a } : undefined}
                  onClick={() => setValue(t)}
                >
                  {t === 'points'
                    ? tf('cap.member_loyalty.type.points', '送积分')
                    : t === 'redeem'
                      ? tf('cap.member_loyalty.type.redeem', '兑礼')
                      : tf('cap.member_loyalty.type.wake', '唤醒')}
                </button>
              ))}
            </div>
          ),
        },
        { key: 'points_delta', label: '积分增减', placeholder: '如 100 或 -50' },
        { key: 'rule_text', label: '活动规则', placeholder: '满100送10…', optional: true },
      ]
    }
    if (mode === 'points') {
      return [
        {
          key: 'member_id',
          label: '选会员',
          render: ({ value, setValue }) => (
            <select className="input" value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">选择会员</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} · {m.points}分 · {statusWord(m.status === 'sleeping')}</option>
              ))}
            </select>
          ),
        },
        {
          key: 'txn_type',
          label: '类型',
          render: ({ value, setValue, accent: a }) => (
            <div className="row-actions">
              <button type="button" className={(value || 'earn') !== 'redeem' ? 'btn' : 'btn btn-ghost'} style={(value || 'earn') !== 'redeem' ? { background: a } : undefined} onClick={() => setValue('earn')}>入账</button>
              <button type="button" className={value === 'redeem' ? 'btn' : 'btn btn-ghost'} style={value === 'redeem' ? { background: a } : undefined} onClick={() => setValue('redeem')}>兑礼</button>
            </div>
          ),
        },
        { key: 'points', label: '积分', placeholder: '如 50' },
        { key: 'reason', label: '原因', placeholder: '到店消费 / 兑礼品', optional: true },
      ]
    }
    return [
      {
        key: 'member_id',
        label: '目标会员',
        render: ({ value, setValue }) => (
          <select className="input" value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">选择会员（可先筛沉睡）</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} · {statusWord(m.status === 'sleeping')} · {m.points}分</option>
            ))}
          </select>
        ),
      },
      {
        key: 'campaign_id',
        label: '挂接活动',
        optional: true,
        render: ({ value, setValue }) => (
          <select className="input" value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">可不选</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ),
      },
      { key: 'message', label: '触达话术', placeholder: '活动提醒文案…', optional: true },
    ]
  }, [mode, members, campaigns, tf, statusWord])

  const switchMode = (m: Mode) => {
    setMode(m)
    setValues({})
    setResetKey((k) => k + 1)
    setMsg('')
  }

  const submit = async () => {
    if (!token) return
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'member') {
        await apiFetch('/api/v1/member-loyalty/members', token, {
          method: 'POST',
          body: JSON.stringify({
            name: (values.name || '').trim(),
            phone: (values.phone || '').trim(),
            points: Number(values.points) || 0,
            app_public_id: appId || '',
          }),
        })
        setMsg('会员已建档')
      } else if (mode === 'campaign') {
        await apiFetch('/api/v1/member-loyalty/campaigns', token, {
          method: 'POST',
          body: JSON.stringify({
            name: (values.name || '').trim(),
            campaign_type: values.campaign_type || 'points',
            rule_text: (values.rule_text || '').trim(),
            points_delta: Number(values.points_delta) || 0,
            app_public_id: appId || '',
          }),
        })
        setMsg('活动已创建')
      } else if (mode === 'points') {
        await apiFetch('/api/v1/member-loyalty/point-txns', token, {
          method: 'POST',
          body: JSON.stringify({
            member_id: values.member_id,
            points: Math.abs(Number(values.points) || 0) || 1,
            txn_type: values.txn_type || 'earn',
            reason: (values.reason || '').trim(),
            app_public_id: appId || '',
          }),
        })
        setMsg('积分已记账')
      } else {
        await apiFetch('/api/v1/member-loyalty/outreaches', token, {
          method: 'POST',
          body: JSON.stringify({
            member_id: values.member_id,
            campaign_id: values.campaign_id || '',
            message: (values.message || '').trim(),
            app_public_id: appId || '',
          }),
        })
        setMsg('触达已登记（待发送）')
      }
      setValues({})
      setResetKey((k) => k + 1)
      await load()
    } catch (e) {
      setMsg(`失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const sendOutreach = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/member-loyalty/outreaches/${id}/send`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`发送失败：${String(e)}`)
    }
  }

  const titles: Record<Mode, string> = {
    member: tf('cap.member_loyalty.mode.member', '建会员档案'),
    campaign: tf('cap.member_loyalty.mode.campaign', '建营销活动'),
    points: tf('cap.member_loyalty.mode.points', '积分入账/兑礼'),
    outreach: tf('cap.member_loyalty.mode.outreach', '沉睡唤醒触达'),
  }

  return (
    <div className="member-loyalty-widget">
      <p className="muted" style={{ marginBottom: 8 }}>
        与首页预约同款：单字段 <strong>&gt;&gt;</strong> 输入，Enter / 确认推进
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        {([
          ['member', titles.member],
          ['campaign', titles.campaign],
          ['points', titles.points],
          ['outreach', titles.outreach],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={mode === k ? 'btn' : 'btn btn-ghost'}
            style={mode === k ? { background: accent } : undefined}
            onClick={() => switchMode(k)}
          >
            {label}
          </button>
        ))}
        {mode === 'outreach' || mode === 'points' ? (
          <button type="button" className={filterSleeping ? 'btn' : 'btn btn-ghost'} style={filterSleeping ? { background: accent } : undefined} onClick={() => setFilterSleeping((v) => !v)}>
            {filterSleeping ? '仅沉睡 ✓' : '筛沉睡'}
          </button>
        ) : null}
      </div>

      <GtgtStepComposer
        title={entrySource === 'im' ? `会员营销 · ${titles[mode]}` : titles[mode]}
        meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
        accent={accent}
        flowHint="会员档案 → 活动 → 积分流水 → 触达"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={`${mode}-${resetKey}`}
        submitLabel={tf('cap.member_loyalty.submit', '提交')}
      />

      {msg && <p className="status-msg">{msg}</p>}

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
          查看数据（会员 {members.length} · 活动 {campaigns.length} · 流水 {txns.length} · 触达 {outreaches.length}）
        </summary>
        <div style={{ marginTop: 12 }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>会员</h4>
      {members.length === 0 && <p className="muted">暂无会员</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {members.slice(0, 8).map((m) => (
          <li key={m.id} className="list-card">
            <div className="list-card-head">
              <strong>{m.name}</strong>
              <span className="tag">{statusWord(m.status === 'sleeping')} · {m.points} 分</span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0' }}>{m.phone || '无手机'} · 最近到店 {m.last_visit_at?.slice(0, 10) || '—'}</p>
          </li>
        ))}
      </ul>

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>活动</h4>
      {campaigns.length === 0 && <p className="muted">暂无活动</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {campaigns.slice(0, 6).map((c) => (
          <li key={c.id} className="list-card">
            <div className="list-card-head">
              <strong>{c.name}</strong>
              <span className="tag">{c.campaign_type} · Δ{c.points_delta}</span>
            </div>
            {c.rule_text && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{c.rule_text}</p>}
          </li>
        ))}
      </ul>

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>积分流水</h4>
      {txns.length === 0 && <p className="muted">暂无流水</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {txns.slice(0, 8).map((t) => (
          <li key={t.id} className="list-card">
            <strong>{t.member_name}</strong>
            <span className="tag" style={{ marginLeft: 8 }}>{t.txn_type === 'earn' ? '入账' : '兑礼'} {t.points}</span>
            <p className="muted" style={{ margin: '4px 0 0' }}>{t.reason}</p>
          </li>
        ))}
      </ul>

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>触达</h4>
      {outreaches.length === 0 && <p className="muted">暂无触达</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {outreaches.slice(0, 8).map((o) => (
          <li key={o.id} className="list-card">
            <div className="list-card-head">
              <strong>{o.member_name}{o.campaign_name ? ` · ${o.campaign_name}` : ''}</strong>
              <span className="tag">{o.status === 'pending' ? '待发送' : '已发送'}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{o.message}</p>
            {o.status === 'pending' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void sendOutreach(o.id)}>确认发送（IM）</button>
            )}
          </li>
        ))}
      </ul>
        </div>
      </details>
    </div>
  )
}
