import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { AgentButtonContent } from '../../components/AgentChevron'
import { createBillingCheckout, formatFen } from '../../api/billing'
import { getToken } from '../../auth/storage'
import { adminLoginUrlWithReturn } from '../../data/brand'
import { PRICING_TIERS } from '../../data/sitePricing'
import { localizePricingTier } from '../../i18n/contentLabels'
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
  const t = useT()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const planId = (params.get('plan') || 'c_plus').trim()
  const rawTier = PRICING_TIERS.find((tier) => tier.id === planId)
  const tier = rawTier ? localizePricingTier(t, rawTier) : undefined
  const { min: minSeats, max: maxSeats } = planSeatBounds(planId)
  const [seats, setSeats] = useState(minSeats)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  usePageMeta({
    title: t('home.enrich.checkout.meta_title'),
    description: t('home.enrich.checkout.meta_desc'),
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
      setError(t('home.enrich.checkout.err_unsupported'))
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
      setError(typeof detail === 'string' ? detail : t('home.enrich.checkout.err_create'))
    } finally {
      setBusy(false)
    }
  }

  if (!tier || !PAID.has(planId)) {
    return (
      <MarketingSiteShell
        skin="landed"
        pageTitle={t('home.enrich.checkout.unsupported_title')}
        pageEyebrow={t('home.enrich.checkout.eyebrow')}
      >
        <p>{t('home.enrich.checkout.unsupported_body')}</p>
        <Link to={ROUTES.pricing}>{t('home.enrich.checkout.back_pricing')}</Link>
        {' · '}
        <a href={ROUTES.contactDemo}>{t('home.enrich.checkout.book_demo')}</a>
      </MarketingSiteShell>
    )
  }

  const seatLabel = planId === 'c_plus'
    ? t('home.enrich.checkout.seats_plus')
    : t('home.enrich.checkout.seats')
  const period = t('home.enrich.checkout.period')

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={t('home.enrich.checkout.upgrade_title', { name: tier.name })}
      pageEyebrow={t('home.enrich.checkout.pay_eyebrow')}
    >
      <form className="enrich-panel" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
        <p style={{ marginBottom: 12 }}>
          {t('home.enrich.checkout.summary', {
            range: tier.range,
            desc: tier.desc,
            period,
          })}
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
        <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          {t('home.enrich.checkout.due', { amount: formatFen(estimate) })}
        </p>
        {error ? <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p> : null}
        <button type="submit" className="b2b-btn-primary agent-action-btn" disabled={busy}>
          <AgentButtonContent>
            {busy ? t('home.enrich.checkout.creating') : t('home.enrich.checkout.pay')}
          </AgentButtonContent>
        </button>
        <p style={{ marginTop: 16 }}>
          <Link to={ROUTES.pricing}>{t('home.enrich.checkout.back_pricing')}</Link>
          {' · '}
          <Link to={ROUTES.accountBilling}>{t('home.enrich.checkout.my_plan')}</Link>
        </p>
      </form>
    </MarketingSiteShell>
  )
}
