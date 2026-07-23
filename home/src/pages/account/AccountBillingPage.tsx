import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { AgentButtonContent } from '../../components/AgentChevron'
import {
  fetchBillingMe,
  fetchBillingOrders,
  formatFen,
  type BillingMe,
  type BillingOrder,
} from '../../api/billing'
import { getToken } from '../../auth/storage'
import { adminLoginUrlWithReturn } from '../../data/brand'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

function QuotaRow({ label, used, remaining }: { label: string; used: number; remaining: number | null }) {
  if (remaining === null) {
    return (
      <li style={{ marginBottom: 8 }}>
        {label}：已用 {used} · 不限
      </li>
    )
  }
  const limit = used + remaining
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  return (
    <li style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <span>{label}</span>
        <span>
          {used} / {limit}（剩 {remaining}）
        </span>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, marginTop: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: 4 }} />
      </div>
    </li>
  )
}

function planUpgradeHint(tier: string): { label: string; href: string } | null {
  if (tier === 'c_free') return { label: '升级 Plus', href: `${ROUTES.pricingCheckout}?plan=c_plus` }
  if (tier === 'c_plus') return { label: '升级 Team（团队）', href: `${ROUTES.pricingCheckout}?plan=b_team` }
  if (tier === 'b_team') return { label: '升级 Business', href: `${ROUTES.pricingCheckout}?plan=b_business` }
  if (tier === 'b_business') return { label: '咨询 Enterprise', href: ROUTES.pricing }
  return null
}

export default function AccountBillingPage() {
  const [me, setMe] = useState<BillingMe | null>(null)
  const [orders, setOrders] = useState<BillingOrder[]>([])
  const [error, setError] = useState('')

  usePageMeta({ title: '我的套餐 · 积木仓', description: '套餐、配额剩余与消费流水' })

  useEffect(() => {
    if (!getToken()) {
      window.location.href = adminLoginUrlWithReturn(ROUTES.accountBilling)
      return
    }
    Promise.all([fetchBillingMe(), fetchBillingOrders(30)])
      .then(([summary, list]) => {
        setMe(summary)
        setOrders(list)
      })
      .catch((e) => {
        const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(typeof detail === 'string' ? detail : '加载失败')
      })
  }, [])

  const upgrade = me ? planUpgradeHint(me.plan_tier) : null
  const features = (me?.plan?.features as string[] | undefined) || []
  const packs = me?.plan?.industry_packs
  const schemaApproval = Boolean(me?.plan?.schema_approval)

  return (
    <MarketingSiteShell skin="landed" pageTitle="我的套餐" pageEyebrow="账户中心" pageLead="当前套餐、配额剩余与消费流水">
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      {!error && !me ? <p>加载中…</p> : null}
      {me ? (
        <section className="enrich-panel" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{me.plan?.name || me.plan_tier}</h2>
          <p style={{ marginBottom: 8 }}>
            坐席 {me.seat_quota}
            {me.plan_expires_at ? ` · 有效至 ${me.plan_expires_at.slice(0, 10)}` : ' · Free 无到期'}
          </p>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
            {me.plan?.price_label || ''} · 配额剩余非钱包余额
          </p>
          <div
            style={{
              display: 'grid',
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            <div>
              行业包：
              {packs === null || packs === undefined
                ? '不限'
                : packs === 0
                  ? '不含（请用办公模块 / 自由搭配）'
                  : `最多 ${packs} 个`}
            </div>
            <div>改页审批：{schemaApproval ? '开启（Business+）' : '关闭（提交即生效）'}</div>
            {features.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
            <QuotaRow
              label="对话改页（今日）"
              used={me.usage.compose_edit_today || 0}
              remaining={me.remaining.compose_edit_today ?? null}
            />
            <QuotaRow
              label={`${me.smart_page_label || '智能出页'}（今日）`}
              used={me.usage.smart_page_today || 0}
              remaining={me.remaining.smart_page_today ?? null}
            />
            <QuotaRow
              label={`${me.smart_page_label || '智能出页'}（本月）`}
              used={me.usage.smart_page_month || 0}
              remaining={me.remaining.smart_page_month ?? null}
            />
            <QuotaRow
              label="代码下载（累计）"
              used={me.usage.code_download_lifetime || 0}
              remaining={me.remaining.code_download_lifetime ?? null}
            />
            <QuotaRow
              label="代码下载（本月）"
              used={me.usage.code_download_month || 0}
              remaining={me.remaining.code_download_month ?? null}
            />
          </ul>
          {upgrade ? (
            <Link to={upgrade.href} className="b2b-btn-primary agent-action-btn">
              <AgentButtonContent>{upgrade.label}</AgentButtonContent>
            </Link>
          ) : (
            <Link to={ROUTES.pricing} className="b2b-btn-primary agent-action-btn">
              <AgentButtonContent>查看定价</AgentButtonContent>
            </Link>
          )}
        </section>
      ) : null}

      <section className="enrich-panel">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>消费流水</h2>
        {orders.length === 0 ? <p className="muted">暂无订单</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {orders.map((o) => (
            <li
              key={o.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid #e2e8f0',
                fontSize: 14,
              }}
            >
              <span>
                {o.created_at?.slice(0, 16).replace('T', ' ') || '—'} · {o.plan_tier} · {o.seats} 席
              </span>
              <span>
                {formatFen(o.amount_fen)} · {o.status}
              </span>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 16 }}>
          <Link to={ROUTES.pricing}>查看全部定价</Link>
        </p>
      </section>
    </MarketingSiteShell>
  )
}
