import DemoBookingComposer from './DemoBookingComposer'
import BookingFloatingAgent from './BookingFloatingAgent'

export default function B2BDemoForm() {
  return (
    <>
      <div className="b2b-form-box b2b-form-box-composer">
        <DemoBookingComposer />
      </div>
      <BookingFloatingAgent />
    </>
  )
}
