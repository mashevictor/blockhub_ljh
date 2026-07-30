import { registerWidget } from '@blockhub/web-core'
import { MeetingBookingWidget } from './MeetingBookingWidget'

import './locales'
registerWidget('MeetingBookingWidget', MeetingBookingWidget as Parameters<typeof registerWidget>[1])
export { MeetingBookingWidget }
