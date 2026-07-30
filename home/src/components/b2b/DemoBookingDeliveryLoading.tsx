import { useT } from '@blockhub/i18n/react'
import { ChevronDotLoadingRow } from '../ChevronDotLoader'

/** 预约提交后 · 智能体整理资料包 */
export default function DemoBookingDeliveryLoading({ compact = false }: { compact?: boolean }) {
  const t = useT()
  return (
    <div className={`demo-booking-delivery-loading${compact ? ' is-compact' : ''}`}>
      <ChevronDotLoadingRow variant="scan" size="sm" text={t('home.booking.loading.text')} />
      <p className="demo-booking-delivery-loading-hint">{t('home.booking.loading.hint')}</p>
    </div>
  )
}
