import { registerWidget } from '@blockhub/web-core'
import { DealEvidenceWidget } from './DealEvidenceWidget'

import './locales'
registerWidget('DealEvidenceWidget', DealEvidenceWidget as Parameters<typeof registerWidget>[1])
export { DealEvidenceWidget }
