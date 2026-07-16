import { registerWidget } from '@blockhub/web-core'
import { ItTicketWidget } from './ItTicketWidget'

registerWidget('ItTicketWidget', ItTicketWidget as Parameters<typeof registerWidget>[1])
export { ItTicketWidget }
