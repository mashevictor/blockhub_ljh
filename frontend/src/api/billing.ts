import { api } from './client'

export interface PlanInfo {
  id: string
  segment?: string
  name: string
  price_label?: string
  max_apps?: number | null
  industry_packs?: number | null
  schema_approval?: boolean
  features?: string[]
  [key: string]: unknown
}

export interface BillingMe {
  plan_tier: string
  seat_quota: number
  plan_expires_at: string | null
  plan: PlanInfo
  smart_page_label?: string
  usage: Record<string, number>
  remaining: Record<string, number | null>
}

export function fetchBillingMe() {
  return api.get<BillingMe>('/billing/me').then((r) => r.data)
}
