import { useEffect, useRef } from 'react'
import { useT } from '@blockhub/i18n/react'
import { useDemoBooking } from '../../context/DemoBookingContext'
import { BOOKING_FIELDS } from '../../data/demoBookingFlow'
import { AgentChevronGlyph } from '../AgentChevron'
import DemoBookingFlowDiagram from './DemoBookingFlowDiagram'
import DemoBookingSuccess from './DemoBookingSuccess'
import DemoBookingDeliveryLoading from './DemoBookingDeliveryLoading'

/** 预约区：流程 + 底部悬浮输入 */
export default function DemoBookingComposer() {
  const t = useT()
  const wrapRef = useRef<HTMLDivElement>(null)
  const {
    stepIndex,
    submitted,
    submitting,
    delivery,
    filledCount,
    setInView,
    focusFloatingInput,
  } = useDemoBooking()

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let visible = false
    const io = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.intersectionRatio ?? 0
        if (ratio >= 0.22) visible = true
        else if (ratio <= 0.08) visible = false
        setInView(visible)
      },
      { threshold: [0, 0.08, 0.22, 0.45], rootMargin: '-72px 0px -28% 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      setInView(false)
    }
  }, [setInView])

  return (
    <div className={`demo-booking-composer${submitted ? ' submitted' : ''}`} ref={wrapRef} id="contact-demo">
      <div className="demo-booking-head">
        <span className="agent-brand-trigger mini" aria-hidden>
          <AgentChevronGlyph size="xs" className="agent-brand-chev" />
          <span className="agent-brand-chev-label">{t('home.booking.chev')}</span>
        </span>
        <span className="demo-booking-title">{t('home.booking.title')}</span>
        <span className="demo-booking-meta">
          {submitted ? t('home.booking.done') : `${filledCount}/${BOOKING_FIELDS.length}`}
        </span>
      </div>

      <DemoBookingFlowDiagram
        stepIndex={stepIndex}
        submitted={submitted}
      />

      {submitted && submitting && <DemoBookingDeliveryLoading />}

      {submitted && !submitting && delivery && (
        <DemoBookingSuccess delivery={delivery} />
      )}

      {submitted && !submitting && !delivery && (
        <p className="demo-booking-success-offline">{t('home.booking.offline')}</p>
      )}

      {!submitted && (
        <p className="demo-booking-float-hint">
          {t('home.booking.float_hint')}
          <button type="button" className="demo-booking-focus-float" onClick={focusFloatingInput}>
            {t('home.booking.go_fill')}
          </button>
        </p>
      )}
    </div>
  )
}
