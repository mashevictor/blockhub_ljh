import { api } from './client'

export interface BillingOrder {
  id: string
  tenant_id: string
  user_id: string
  plan_tier: string
  seats: number
  amount_fen: number
  currency: string
  status: string
  provider: string
  provider_order_no: string
  pay_url: string
  paid_at?: string | null
  created_at?: string | null
}

export interface BillingMe {
  plan: {
    id: string
    name: string
    price_label?: string
    features?: string[]
    industry_packs?: number | null
    schema_approval?: boolean
    max_apps?: number | null
  }
  plan_tier: string
  seat_quota: number
  plan_expires_at?: string | null
  smart_page_label?: string
  usage: Record<string, number>
  remaining: Record<string, number | null>
  recent_orders?: BillingOrder[]
}

export async function fetchBillingMe() {
  const res = await api.get<BillingMe>('/billing/me')
  return res.data
}

export async function fetchBillingOrders(limit = 50) {
  const res = await api.get<{ items: BillingOrder[] }>('/billing/orders', { params: { limit } })
  return res.data.items
}

export async function fetchBillingOrder(orderId: string) {
  const res = await api.get<{ order: BillingOrder }>(`/billing/orders/${orderId}`)
  return res.data.order
}

export async function createBillingCheckout(body: { plan_tier: string; seats?: number; months?: number }) {
  const res = await api.post<{ success: boolean; order: BillingOrder }>('/billing/checkout', body)
  return res.data.order
}

export function formatFen(fen: number) {
  return `¥${(fen / 100).toFixed(fen % 100 === 0 ? 0 : 2)}`
}
