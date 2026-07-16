import { registerWidget } from '@blockhub/web-core'
import { MeetingBookingWidget } from './MeetingBookingWidget'

registerWidget('MeetingBookingWidget', MeetingBookingWidget as Parameters<typeof registerWidget>[1])
export { MeetingBookingWidget }
