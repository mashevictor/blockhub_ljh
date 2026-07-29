import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { fetchBillingMe, fetchBillingOrder, formatFen, type BillingMe, type BillingOrder } from '../../api/billing'
import { getToken } from '../../auth/storage'
import { adminLoginUrlWithReturn } from '../../data/brand'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function PricingResultPage() {
  const t = useT()
  const [params] = useSearchParams()
  const orderId = (params.get('order_id') || '').trim()
  const [order, setOrder] = useState<BillingOrder | null>(null)
  const [me, setMe] = useState<BillingMe | null>(null)
  const [error, setError] = useState('')

  usePageMeta({
    title: t('home.enrich.result.meta_title'),
    description: t('home.enrich.result.meta_desc'),
  })

  useEffect(() => {
    if (!getToken()) {
      window.location.href = adminLoginUrlWithReturn(`${ROUTES.pricingResult}?order_id=${orderId}`)
      return
    }
    if (!orderId) {
      setError(t('home.enrich.result.missing_order'))
      return
    }
    let cancelled = false
    let tries = 0
    const tick = async () => {
      try {
        const o = await fetchBillingOrder(orderId)
        if (cancelled) return
        setOrder(o)
        if (o.status === 'paid') {
          const summary = await fetchBillingMe()
          if (!cancelled) setMe(summary)
          return
        }
        tries += 1
        if (tries < 40) window.setTimeout(() => void tick(), 2000)
      } catch (e) {
        if (!cancelled) {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setError(typeof detail === 'string' ? detail : t('home.enrich.result.query_fail'))
        }
      }
    }
    void tick()
    return () => {
      cancelled = true
    }
  }, [orderId, t])

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={t('home.enrich.result.title')}
      pageEyebrow={t('home.enrich.result.eyebrow')}
    >
      <div className="enrich-panel" style={{ maxWidth: 560 }}>
        {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
        {!error && !order ? <p>{t('home.enrich.result.confirming')}</p> : null}
        {order ? (
          <>
            <p>
              {t('home.enrich.result.order_line', {
                id: order.id.slice(0, 8),
                tier: order.plan_tier,
                amount: formatFen(order.amount_fen),
              })}
            </p>
            <p style={{ fontSize: 18, fontWeight: 600 }}>
              {order.status === 'paid'
                ? t('home.enrich.result.paid')
                : t('home.enrich.result.status', { status: order.status })}
            </p>
            {me ? (
              <p style={{ marginTop: 12 }}>
                {t('home.enrich.result.current', { name: me.plan?.name || me.plan_tier })}
                {me.plan_expires_at
                  ? t('home.enrich.result.expires', { date: me.plan_expires_at.slice(0, 10) })
                  : ''}
              </p>
            ) : null}
          </>
        ) : null}
        <p style={{ marginTop: 20 }}>
          <Link to={ROUTES.accountBilling}>{t('home.enrich.result.view_plan')}</Link>
          {' · '}
          <Link to={ROUTES.pricing}>{t('home.enrich.result.back_pricing')}</Link>
        </p>
      </div>
    </MarketingSiteShell>
  )
}
