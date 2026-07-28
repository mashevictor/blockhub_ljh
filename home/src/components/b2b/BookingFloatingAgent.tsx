import { useEffect, useRef } from 'react'
import { useT } from '@blockhub/i18n/react'
import { AgentButtonContent, AgentChevronGlyph } from '../AgentChevron'
import { BOOK_DEMO_LOADING } from '../../data/publishUi'
import { useDemoBooking } from '../../context/DemoBookingContext'
import { BOOKING_FIELDS } from '../../data/demoBookingFlow'
import DemoBookingSuccess from './DemoBookingSuccess'
import DemoBookingDeliveryLoading from './DemoBookingDeliveryLoading'
import FloatingAgentDock from '../FloatingAgentDock'

/** 预约区专用 >> 悬浮输入，与创建应用悬浮框完全独立 */
export default function BookingFloatingAgent() {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    inView,
    submitted,
    submitting,
    delivery,
    values,
    currentField,
    draft,
    fieldError,
    missingHint,
    filledCount,
    stepIndex,
    setDraft,
    submitDraft,
    skipOptional,
    retrySubmit,
    registerFloatingInput,
  } = useDemoBooking()

  useEffect(() => {
    registerFloatingInput(inView ? inputRef.current : null)
    return () => registerFloatingInput(null)
  }, [registerFloatingInput, inView, stepIndex, currentField?.key, submitted])

  const isLastStep = currentField?.key === 'company'
  const dockTitle = submitted ? t('home.booking.submitted') : t('home.booking.title')
  const chevLabel = submitted ? t('home.booking.chev') : (currentField?.chevLabel ?? t('home.booking.chev'))
  const collapsedHint = submitted
    ? t('home.booking.hint_submitted')
    : `>> ${currentField?.label ?? t('home.booking.chev')} · ${currentField?.placeholder ?? ''}`

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitDraft()
    }
  }

  return (
    <FloatingAgentDock
      storageKey="tc-floating-booking"
      className={`floating-agent-dock-booking${inView ? ' is-booking-active' : ' is-booking-idle'}`}
      title={dockTitle}
      chevLabel={chevLabel}
      collapsedHint={collapsedHint}
      variant="capsule"
      collapseToggleInTail
      showDockToggle={false}
      ariaLabel={t('home.booking.aria')}
    >
      {!inView ? (
        <div className="booking-float-composer" aria-hidden />
      ) : (
        <div className="booking-float-composer">
          {!submitted && (
            <div className="booking-float-status">
              <span className="booking-float-progress">{filledCount}/{BOOKING_FIELDS.length}</span>
              {missingHint && (
                <span className="booking-float-missing">{missingHint}</span>
              )}
            </div>
          )}

          {!submitted && currentField && (
            <>
              <div className="booking-float-input-row">
                <span className="booking-float-prefix" aria-hidden>
                  <AgentChevronGlyph size="xs" /> {currentField.label}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode={currentField.key === 'contact' ? 'email' : 'text'}
                  className="booking-float-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentField.hint}
                  aria-label={currentField.label}
                  disabled={submitting}
                />
                <button type="button" className="booking-float-go" onClick={submitDraft} disabled={submitting}>
                  {submitting && isLastStep ? (
                    BOOK_DEMO_LOADING
                  ) : (
                    <AgentButtonContent trailing={false}>
                      {isLastStep ? '提交' : '确认'}
                    </AgentButtonContent>
                  )}
                </button>
              </div>
              {currentField.ghost && !submitting && (
                <p className="booking-float-ghost">{currentField.ghost}</p>
              )}
              {!currentField.required && !submitting && (
                <button type="button" className="booking-float-skip" onClick={skipOptional}>
                  跳过
                </button>
              )}
            </>
          )}

          {submitted && (
            <>
              {submitting && <DemoBookingDeliveryLoading compact />}
              {delivery && !submitting && <DemoBookingSuccess delivery={delivery} compact />}
              {!delivery && !submitting && (
                <ul className="booking-float-review-list" aria-label="已提交的预约信息">
                  {BOOKING_FIELDS.map((field) => {
                    const value = values[field.key]?.trim()
                    return (
                      <li key={field.key} className={!value ? 'is-empty' : ''}>
                        <span>{field.label}</span>
                        <strong>{value || '未填写'}</strong>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {fieldError && (
            <p className="booking-float-error" role="alert">
              <AgentChevronGlyph size="xs" />
              {fieldError}
              {submitted && !submitting && (
                <button type="button" className="booking-float-retry" onClick={retrySubmit}>
                  重试
                </button>
              )}
            </p>
          )}
        </div>
      )}
    </FloatingAgentDock>
  )
}
