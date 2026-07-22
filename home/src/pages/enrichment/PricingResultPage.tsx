import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { fetchBillingMe, fetchBillingOrder, formatFen, type BillingMe, type BillingOrder } from '../../api/billing'
import { getToken } from '../../auth/storage'
import { getAdminUrl } from '../../data/constants'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function PricingResultPage() {
  const [params] = useSearchParams()
  const orderId = (params.get('order_id') || '').trim()
  const [order, setOrder] = useState<BillingOrder | null>(null)
  const [me, setMe] = useState<BillingMe | null>(null)
  const [error, setError] = useState('')

  usePageMeta({ title: '支付结果 · 积木仓', description: '套餐升级结果' })

  useEffect(() => {
    if (!getToken()) {
      window.location.href = `${getAdminUrl()}?from=${encodeURIComponent(`${ROUTES.pricingResult}?order_id=${orderId}`)}`
      return
    }
    if (!orderId) {
      setError('缺少订单号')
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
          setError(typeof detail === 'string' ? detail : '查询订单失败')
        }
      }
    }
    void tick()
    return () => {
      cancelled = true
    }
  }, [orderId])

  return (
    <MarketingSiteShell skin="landed" pageTitle="支付结果" pageEyebrow="升级套餐">
      <div className="enrich-panel" style={{ maxWidth: 560 }}>
        {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
        {!error && !order ? <p>正在确认支付状态…</p> : null}
        {order ? (
          <>
            <p>
              订单 <code>{order.id.slice(0, 8)}</code> · {order.plan_tier} · {formatFen(order.amount_fen)}
            </p>
            <p style={{ fontSize: 18, fontWeight: 600 }}>
              {order.status === 'paid' ? '支付成功，套餐已生效' : `状态：${order.status}（可稍候刷新）`}
            </p>
            {me ? (
              <p style={{ marginTop: 12 }}>
                当前套餐：{me.plan?.name || me.plan_tier}
                {me.plan_expires_at ? ` · 有效至 ${me.plan_expires_at.slice(0, 10)}` : ''}
              </p>
            ) : null}
          </>
        ) : null}
        <p style={{ marginTop: 20 }}>
          <Link to={ROUTES.accountBilling}>查看我的套餐与用量</Link>
          {' · '}
          <Link to={ROUTES.pricing}>返回定价</Link>
        </p>
      </div>
    </MarketingSiteShell>
  )
}
