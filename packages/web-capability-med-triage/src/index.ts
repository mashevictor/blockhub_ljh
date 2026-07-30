import { registerWidget } from '@blockhub/web-core'
import { MedTriageWidget } from './MedTriageWidget'

import './locales'
registerWidget('MedTriageWidget', MedTriageWidget as Parameters<typeof registerWidget>[1])
export { MedTriageWidget }
