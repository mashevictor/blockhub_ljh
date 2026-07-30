import { ROUTES } from '../routes/paths'
import { homeT } from '../i18n/homeT'

/** 从 API 402 detail 提取可读文案 */
export function quotaErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string }; status?: number } })?.response?.data
    ?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (err instanceof Error && err.message) return err.message
  return homeT('home.quota.insufficient')
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
    // 延后 confirm，让发布流水线先关掉进度遮罩（避免卡在 22% 叠对话框）
    const lower = msg.toLowerCase()
    let plan = 'c_plus'
    if (
      lower.includes('business') ||
      msg.includes('审批') ||
      msg.includes('行业包') ||
      msg.includes('商用') ||
      msg.includes('组织') ||
      lower.includes('approval') ||
      lower.includes('industry pack') ||
      lower.includes('commercial') ||
      lower.includes('organization')
    ) {
      plan = 'b_business'
    }
    window.setTimeout(() => {
      const go = window.confirm(`${msg}\n\n${homeT('home.quota.upgrade_confirm')}`)
      if (go) redirectToUpgrade(plan)
    }, 80)
    throw Object.assign(new Error(msg), { response: (err as { response?: unknown }).response })
  }
  throw err
}
