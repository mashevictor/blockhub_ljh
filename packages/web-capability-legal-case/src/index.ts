import { registerWidget } from '@blockhub/web-core'
import { LegalCaseWidget } from './LegalCaseWidget'

registerWidget('LegalCaseWidget', LegalCaseWidget as Parameters<typeof registerWidget>[1])
export { LegalCaseWidget }
