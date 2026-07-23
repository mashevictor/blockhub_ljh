import { ROUTES } from '../routes/paths'

/** 从 API 402 detail 提取可读文案 */
export function quotaErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string }; status?: number } })?.response?.data
    ?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (err instanceof Error && err.message) return err.message
  return '当前套餐配额不足，请升级后重试'
}

export function isQuotaError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status
  return status === 402
}

/** 配额不足 → 跳转升级页（可选 plan） */
export function redirectToUpgrade(plan = 'c_plus'): void {
  const path = `${ROUTES.pricingCheckout}?plan=${encodeURIComponent(plan)}`
  window.location.href = path
}

/** 处理发布等写操作的 402：提示并引导升级 */
export function handleQuotaOrThrow(err: unknown): never {
  if (isQuotaError(err)) {
    const msg = quotaErrorMessage(err)
    const go = window.confirm(`${msg}\n\n是否前往升级套餐？`)
    if (go) {
      const lower = msg.toLowerCase()
      let plan = 'c_plus'
      if (lower.includes('team') || msg.includes('行业包') || msg.includes('Team')) plan = 'b_team'
      if (lower.includes('business') || msg.includes('审批')) plan = 'b_business'
      redirectToUpgrade(plan)
    }
    throw Object.assign(new Error(msg), { response: (err as { response?: unknown }).response })
  }
  throw err
}
