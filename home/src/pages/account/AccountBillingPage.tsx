import { useEffect, useState, type CSSProperties } from 'react'
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
import { pricingTierTheme } from '../../data/enrichVisualThemes'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

type QuotaItem = {
  key: string
  label: string
  used: number
  remaining: number | null
  period: string
}

function planUpgradeHint(tier: string): { label: string; href: string } | null {
  if (tier === 'c_free') return { label: '升级 Plus', href: `${ROUTES.pricingCheckout}?plan=c_plus` }
  if (tier === 'c_plus') return { label: '升级 Team（团队）', href: `${ROUTES.pricingCheckout}?plan=b_team` }
  if (tier === 'b_team') return { label: '升级 Business', href: `${ROUTES.pricingCheckout}?plan=b_business` }
  if (tier === 'b_business') return { label: '咨询 Enterprise', href: ROUTES.pricing }
  return null
}

function statusLabel(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'paid' || s === 'success') return '已支付'
  if (s === 'pending' || s === 'created') return '待支付'
  if (s === 'failed' || s === 'cancelled' || s === 'canceled') return '已关闭'
  return status || '—'
}

function statusTone(status: string): 'ok' | 'wait' | 'muted' {
  const s = (status || '').toLowerCase()
  if (s === 'paid' || s === 'success') return 'ok'
  if (s === 'pending' || s === 'created') return 'wait'
  return 'muted'
}

function QuotaMeter({ item }: { item: QuotaItem }) {
  const unlimited = item.remaining === null
  const limit = unlimited ? 0 : item.used + (item.remaining || 0)
  const pct = !unlimited && limit > 0 ? Math.min(100, Math.round((item.used / limit) * 100)) : 0
  const near = !unlimited && pct >= 85

  return (
    <article className={`acc-quota-card${near ? ' is-near' : ''}${unlimited ? ' is-unlimited' : ''}`}>
      <div className="acc-quota-card__top">
        <span className="acc-quota-card__period">{item.period}</span>
        <strong className="acc-quota-card__label">{item.label}</strong>
      </div>
      {unlimited ? (
        <div className="acc-quota-card__value">
          <span className="acc-quota-card__used">{item.used}</span>
          <span className="acc-quota-card__sep">·</span>
          <span className="acc-quota-card__limit">不限</span>
        </div>
      ) : (
        <>
          <div className="acc-quota-card__value">
            <span className="acc-quota-card__used">{item.used}</span>
            <span className="acc-quota-card__sep">/</span>
            <span className="acc-quota-card__limit">{limit}</span>
          </div>
          <div className="acc-quota-card__bar" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="acc-quota-card__remain">剩余 {item.remaining}</p>
        </>
      )}
    </article>
  )
}

function buildQuotas(me: BillingMe): QuotaItem[] {
  const smart = me.smart_page_label || '智能出页'
  return [
    {
      key: 'compose',
      label: '对话改页',
      period: '今日',
      used: me.usage.compose_edit_today || 0,
      remaining: me.remaining.compose_edit_today ?? null,
    },
    {
      key: 'smart_day',
      label: smart,
      period: '今日',
      used: me.usage.smart_page_today || 0,
      remaining: me.remaining.smart_page_today ?? null,
    },
    {
      key: 'smart_month',
      label: smart,
      period: '本月',
      used: me.usage.smart_page_month || 0,
      remaining: me.remaining.smart_page_month ?? null,
    },
    {
      key: 'dl_life',
      label: '代码下载',
      period: '累计',
      used: me.usage.code_download_lifetime || 0,
      remaining: me.remaining.code_download_lifetime ?? null,
    },
    {
      key: 'dl_month',
      label: '代码下载',
      period: '本月',
      used: me.usage.code_download_month || 0,
      remaining: me.remaining.code_download_month ?? null,
    },
  ]
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
  const theme = pricingTierTheme(me?.plan_tier || 'c_free')
  const quotas = me ? buildQuotas(me) : []
  const packsLabel =
    packs === null || packs === undefined
      ? '行业包不限'
      : packs === 0
        ? '不含行业包'
        : `行业包最多 ${packs} 个`
  const expiresLabel = me?.plan_expires_at
    ? `有效至 ${me.plan_expires_at.slice(0, 10)}`
    : '无到期日'
  const unlimitedQuotaCount = quotas.filter((q) => q.remaining === null).length

  return (
    <MarketingSiteShell skin="landed" pageTitle="我的套餐" pageEyebrow="账户中心" pageLead="当前套餐、配额剩余与消费流水">
      {error ? <p className="acc-billing-error">{error}</p> : null}
      {!error && !me ? (
        <div className="acc-billing-loading" aria-live="polite">
          <span className="acc-billing-loading__pulse" />
          正在加载套餐与用量…
        </div>
      ) : null}

      {me ? (
        <div className="acc-billing reveal">
          <section
            className="acc-plan-hero"
            style={
              {
                '--plan-accent': theme.color,
                '--plan-from': theme.from,
                '--plan-to': theme.to,
              } as CSSProperties
            }
          >
            <div className="acc-plan-hero__main">
              <div className="acc-plan-hero__badge-row">
                <span className="acc-plan-hero__badge">{me.plan_tier.replace(/_/g, ' ').toUpperCase()}</span>
                <span className="acc-plan-hero__price">{me.plan?.price_label || '—'}</span>
              </div>
              <h2 className="acc-plan-hero__name">{me.plan?.name || me.plan_tier}</h2>
              <p className="acc-plan-hero__meta">
                <span>{me.seat_quota} 坐席</span>
                <span className="acc-plan-hero__dot" aria-hidden />
                <span>{expiresLabel}</span>
              </p>
              <p className="acc-plan-hero__note">合同 / 订阅制 · 下方配额为用量剩余，不是钱包余额</p>

              <div className="acc-plan-hero__chips">
                <span className="acc-chip">{packsLabel}</span>
                <span className={`acc-chip${schemaApproval ? ' is-on' : ''}`}>
                  改页审批 · {schemaApproval ? '开启' : '关闭'}
                </span>
                {me.plan?.max_apps == null ? (
                  <span className="acc-chip">应用数不限</span>
                ) : (
                  <span className="acc-chip">应用最多 {me.plan.max_apps} 个</span>
                )}
              </div>

              <div className="acc-plan-hero__actions">
                {upgrade ? (
                  <Link to={upgrade.href} className="b2b-btn-primary agent-action-btn">
                    <AgentButtonContent>{upgrade.label}</AgentButtonContent>
                  </Link>
                ) : (
                  <Link to={ROUTES.pricing} className="b2b-btn-primary agent-action-btn">
                    <AgentButtonContent>查看定价</AgentButtonContent>
                  </Link>
                )}
                <Link to={ROUTES.pricing} className="acc-btn-ghost">
                  全部套餐说明
                </Link>
              </div>
            </div>

            <aside className="acc-plan-hero__side" aria-label="套餐权益摘要">
              <p className="acc-plan-hero__side-label">套餐权益</p>
              {features.length > 0 ? (
                <ul className="acc-feature-list">
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                <p className="acc-plan-hero__side-empty">暂无额外权益说明</p>
              )}
              <div className="acc-plan-hero__stat-row">
                <div>
                  <strong>{unlimitedQuotaCount}</strong>
                  <span>项不限用量</span>
                </div>
                <div>
                  <strong>{quotas.length - unlimitedQuotaCount}</strong>
                  <span>项有配额</span>
                </div>
              </div>
            </aside>
          </section>

          <section className="enrich-panel acc-quota-panel reveal d2" aria-labelledby="acc-quota-title">
            <div className="enrich-panel-head">
              <h2 id="acc-quota-title">用量与配额</h2>
              <p>对话改页、智能出页与代码下载的实时消耗；组织套餐为共享配额。</p>
            </div>
            <div className="enrich-panel-body">
              <div className="acc-quota-grid">
                {quotas.map((q) => (
                  <QuotaMeter key={q.key} item={q} />
                ))}
              </div>
            </div>
          </section>

          <section className="enrich-panel acc-orders-panel reveal d3" aria-labelledby="acc-orders-title">
            <div className="enrich-panel-head">
              <h2 id="acc-orders-title">消费流水</h2>
              <p>最近 {orders.length || 0} 笔升级 / 续费订单</p>
            </div>
            <div className="enrich-panel-body">
              {orders.length === 0 ? (
                <div className="acc-orders-empty">
                  <p>暂无订单记录</p>
                  <Link to={ROUTES.pricing} className="acc-btn-ghost">
                    去看定价
                  </Link>
                </div>
              ) : (
                <ul className="acc-orders-list">
                  {orders.map((o) => (
                    <li key={o.id} className="acc-order-row">
                      <div className="acc-order-row__main">
                        <strong>
                          {o.plan_tier} · {o.seats} 席
                        </strong>
                        <span>{o.created_at?.slice(0, 16).replace('T', ' ') || '—'}</span>
                      </div>
                      <div className="acc-order-row__meta">
                        <span className="acc-order-row__amount">{formatFen(o.amount_fen)}</span>
                        <span className={`acc-status acc-status--${statusTone(o.status)}`}>
                          {statusLabel(o.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="acc-orders-foot">
                <Link to={ROUTES.pricing}>查看全部定价</Link>
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </MarketingSiteShell>
  )
}
