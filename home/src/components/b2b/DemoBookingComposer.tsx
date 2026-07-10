import { useEffect, useRef } from 'react'
import { useDemoBooking } from '../../context/DemoBookingContext'
import { BOOKING_FIELDS } from '../../data/demoBookingFlow'
import DemoBookingFlowDiagram from './DemoBookingFlowDiagram'

/** 预约区：流程 + 底部悬浮输入 */
export default function DemoBookingComposer() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const {
    stepIndex,
    submitted,
    filledCount,
    setInView,
    focusFloatingInput,
  } = useDemoBooking()

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.2)),
      { threshold: [0.2, 0.45, 0.7], rootMargin: '-60px 0px -35% 0px' },
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
          <span className="agent-brand-chev">&gt;&gt;</span>
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
