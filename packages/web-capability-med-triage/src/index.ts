import { registerWidget } from '@blockhub/web-core'
import { MedTriageWidget } from './MedTriageWidget'

registerWidget('MedTriageWidget', MedTriageWidget as Parameters<typeof registerWidget>[1])
export { MedTriageWidget }
