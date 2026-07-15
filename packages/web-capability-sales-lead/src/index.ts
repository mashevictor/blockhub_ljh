import { registerWidget } from '@blockhub/web-core'
import { SalesLeadWidget } from './SalesLeadWidget'

registerWidget('SalesLeadWidget', SalesLeadWidget as Parameters<typeof registerWidget>[1])
export { SalesLeadWidget }
