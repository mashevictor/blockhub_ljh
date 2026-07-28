import { registerWidget } from '@blockhub/web-core'
import { SalesLeadWidget } from './SalesLeadWidget'

import './locales'
registerWidget('SalesLeadWidget', SalesLeadWidget as Parameters<typeof registerWidget>[1])
export { SalesLeadWidget }
