import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { AgentButtonContent } from '../../components/AgentChevron'
import { createBillingCheckout, formatFen } from '../../api/billing'
import { getToken } from '../../auth/storage'
import { adminLoginUrlWithReturn } from '../../data/brand'
import { PRICING_TIERS } from '../../data/sitePricing'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

const PAID = new Set(['c_plus', 'b_business'])

function planSeatBounds(planId: string): { min: number; max: number } {
  if (planId === 'c_plus') return { min: 1, max: 3 }
  if (planId === 'b_business') return { min: 1, max: 500 }
  return { min: 1, max: 1 }
}

function planUnitFen(planId: string): number {
  if (planId === 'c_plus') return 3900
  if (planId === 'b_business') return 14800
  return 0
}

export default function PricingCheckoutPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const planId = (params.get('plan') || 'c_plus').trim()
  const tier = PRICING_TIERS.find((t) => t.id === planId)
  const { min: minSeats, max: maxSeats } = planSeatBounds(planId)
  const [seats, setSeats] = useState(minSeats)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  usePageMeta({
    title: '升级套餐 · 积木仓',
    description: '聚合收款升级套餐',
  })

  const estimate = useMemo(() => {
    const n = Math.min(maxSeats, Math.max(seats, minSeats))
    return planUnitFen(planId) * n
  }, [planId, seats, minSeats, maxSeats])

  const ensureLogin = () => {
    if (getToken()) return true
    window.location.href = adminLoginUrlWithReturn(`${ROUTES.pricingCheckout}?plan=${planId}`)
    return false
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!PAID.has(planId)) {
      setError('该套餐不支持在线支付')
      return
    }
    if (!ensureLogin()) return
    setBusy(true)
    try {
      const order = await createBillingCheckout({
        plan_tier: planId,
        seats: Math.min(maxSeats, Math.max(seats, minSeats)),
        months: 1,
      })
      if (order.pay_url) {
        window.location.href = order.pay_url
        return
      }
      navigate(`${ROUTES.pricingResult}?order_id=${encodeURIComponent(order.id)}`)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : '下单失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  if (!tier || !PAID.has(planId)) {
    return (
      <MarketingSiteShell skin="landed" pageTitle="无法升级" pageEyebrow="定价">
        <p>该套餐不支持在线支付。Enterprise 请预约演示申请方案。</p>
        <Link to={ROUTES.pricing}>返回定价</Link>
        {' · '}
        <a href={ROUTES.contactDemo}>预约演示</a>
      </MarketingSiteShell>
    )
  }

  const seatLabel = planId === 'c_plus' ? '开发者人数（最多 3 人）' : '开发者人数'

  return (
    <MarketingSiteShell skin="landed" pageTitle={`升级 ${tier.name}`} pageEyebrow="聚合收款">
      <form className="enrich-panel" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
        <p style={{ marginBottom: 12 }}>
          {tier.range} · {tier.desc} · 首期 1 个月
        </p>
        <label style={{ display: 'block', marginBottom: 16 }}>
          {seatLabel}
          <input
            type="number"
            min={minSeats}
            max={maxSeats}
            value={seats}
            onChange={(ev) => setSeats(Number(ev.target.value) || minSeats)}
            style={{ display: 'block', width: '100%', marginTop: 8, padding: 10 }}
          />
        </label>
        <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>应付 {formatFen(estimate)}</p>
        {error ? <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p> : null}
        <button type="submit" className="b2b-btn-primary agent-action-btn" disabled={busy}>
          <AgentButtonContent>{busy ? '创建订单…' : '去支付'}</AgentButtonContent>
        </button>
        <p style={{ marginTop: 16 }}>
          <Link to={ROUTES.pricing}>返回定价</Link>
          {' · '}
          <Link to={ROUTES.accountBilling}>我的套餐</Link>
        </p>
      </form>
    </MarketingSiteShell>
  )
}
