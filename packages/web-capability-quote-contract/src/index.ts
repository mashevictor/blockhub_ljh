import { registerWidget } from '@blockhub/web-core'
import { QuoteContractWidget } from './QuoteContractWidget'

import './locales'
registerWidget('QuoteContractWidget', QuoteContractWidget as Parameters<typeof registerWidget>[1])
export { QuoteContractWidget }
