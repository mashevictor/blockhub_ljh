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

const PAID = new Set(['c_plus', 'b_team', 'b_business'])

export default function PricingCheckoutPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const planId = (params.get('plan') || 'c_plus').trim()
  const tier = PRICING_TIERS.find((t) => t.id === planId)
  const minSeats = planId === 'b_business' ? 10 : planId === 'b_team' ? 5 : 1
  const [seats, setSeats] = useState(minSeats)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  usePageMeta({
    title: '升级套餐 · 积木仓',
    description: '聚合收款升级套餐',
  })

  const estimate = useMemo(() => {
    const unit =
      planId === 'c_plus' ? 3900 : planId === 'b_team' ? 9800 : planId === 'b_business' ? 16800 : 0
    return unit * Math.max(seats, minSeats)
  }, [planId, seats, minSeats])

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
        seats: Math.max(seats, minSeats),
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
        <p>该套餐不支持在线支付。Enterprise 请预约演示。</p>
        <Link to={ROUTES.pricing}>返回定价</Link>
        {' · '}
        <a href={ROUTES.contactDemo}>预约演示</a>
      </MarketingSiteShell>
    )
  }

  return (
    <MarketingSiteShell skin="landed" pageTitle={`升级 ${tier.name}`} pageEyebrow="聚合收款">
      <form className="enrich-panel" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
        <p style={{ marginBottom: 12 }}>{tier.range} · 首期 1 个月</p>
        {planId !== 'c_plus' ? (
          <label style={{ display: 'block', marginBottom: 16 }}>
            坐席数（起购 {minSeats}）
            <input
              type="number"
              min={minSeats}
              max={500}
              value={seats}
              onChange={(ev) => setSeats(Number(ev.target.value) || minSeats)}
              style={{ display: 'block', width: '100%', marginTop: 8, padding: 10 }}
            />
          </label>
        ) : null}
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
