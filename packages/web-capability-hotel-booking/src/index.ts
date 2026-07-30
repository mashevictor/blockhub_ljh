import { registerWidget } from '@blockhub/web-core'
import { HotelBookingWidget } from './HotelBookingWidget'

import './locales'
registerWidget('HotelBookingWidget', HotelBookingWidget as Parameters<typeof registerWidget>[1])
export { HotelBookingWidget }
