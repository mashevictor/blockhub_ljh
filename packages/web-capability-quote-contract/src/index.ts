import { registerWidget } from '@blockhub/web-core'
import { QuoteContractWidget } from './QuoteContractWidget'

registerWidget('QuoteContractWidget', QuoteContractWidget as Parameters<typeof registerWidget>[1])
export { QuoteContractWidget }
