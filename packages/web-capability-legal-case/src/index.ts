import { registerWidget } from '@blockhub/web-core'
import { LegalCaseWidget } from './LegalCaseWidget'

import './locales'
registerWidget('LegalCaseWidget', LegalCaseWidget as Parameters<typeof registerWidget>[1])
export { LegalCaseWidget }
