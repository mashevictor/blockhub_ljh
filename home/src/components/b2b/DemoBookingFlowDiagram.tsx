import { useT } from '@blockhub/i18n/react'
import { BOOKING_FIELDS } from '../../data/demoBookingFlow'
import { localizeBookingField } from '../../i18n/bookingLabels'

interface Props {
  stepIndex: number
  submitted?: boolean
}

export default function DemoBookingFlowDiagram({ stepIndex, submitted = false }: Props) {
  const t = useT()

  return (
    <div className="demo-booking-flow" aria-label={t('home.booking.flow_aria')}>
      <div className="demo-booking-flow-track">
        {BOOKING_FIELDS.map((field, i) => {
          const done = submitted || i < stepIndex
          const active = !submitted && i === stepIndex
          const localized = localizeBookingField(t, field)

          return (
            <div key={field.key} className="demo-booking-flow-node-wrap">
              {i > 0 && (
                <div className={`demo-booking-flow-edge${done ? ' done' : ''}`} aria-hidden />
              )}
              <div
                className={`demo-booking-flow-node${done ? ' done' : ''}${active ? ' active' : ''}${!done && !active ? ' pending' : ''}`}
              >
                <span className="demo-booking-flow-num">{done ? '✓' : i + 1}</span>
                <span className="demo-booking-flow-label">{localized.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
