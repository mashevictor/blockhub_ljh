import { useEffect, useRef } from 'react'
import { useDemoBooking } from '../../context/DemoBookingContext'
import { BOOKING_FIELDS } from '../../data/demoBookingFlow'
import { AgentChevronGlyph } from '../AgentChevron'
import DemoBookingFlowDiagram from './DemoBookingFlowDiagram'
import DemoBookingSuccess from './DemoBookingSuccess'
import DemoBookingDeliveryLoading from './DemoBookingDeliveryLoading'

/** 预约区：流程 + 底部悬浮输入 */
export default function DemoBookingComposer() {
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
          <span className="agent-brand-chev-label">预约</span>
        </span>
        <span className="demo-booking-title">预约演示</span>
        <span className="demo-booking-meta">
          {submitted ? '已完成' : `${filledCount}/${BOOKING_FIELDS.length}`}
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
        <p className="demo-booking-success-offline">提交状态未知，请滚动到底部悬浮框重试。</p>
      )}

      {!submitted && (
        <p className="demo-booking-float-hint">
          底部悬浮框填写
          <button type="button" className="demo-booking-focus-float" onClick={focusFloatingInput}>
            去填写
          </button>
        </p>
      )}
    </div>
  )
}
