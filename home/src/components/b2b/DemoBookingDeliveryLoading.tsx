import { ChevronDotLoadingRow } from '../ChevronDotLoader'

/** 预约提交后 · 智能体整理资料包 */
export default function DemoBookingDeliveryLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-booking-delivery-loading${compact ? ' is-compact' : ''}`}>
      <ChevronDotLoadingRow variant="scan" size="sm" text="正在整理资料包…" />
      <p className="demo-booking-delivery-loading-hint">生成转发摘要 · 匹配官方审定资料 · 创建专属链接</p>
    </div>
  )
}
