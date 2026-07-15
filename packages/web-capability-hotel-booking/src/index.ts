import { registerWidget } from '@blockhub/web-core'
import { HotelBookingWidget } from './HotelBookingWidget'

registerWidget('HotelBookingWidget', HotelBookingWidget as Parameters<typeof registerWidget>[1])
export { HotelBookingWidget }
