import { registerWidget } from '@blockhub/web-core'
import { DealEvidenceWidget } from './DealEvidenceWidget'

registerWidget('DealEvidenceWidget', DealEvidenceWidget as Parameters<typeof registerWidget>[1])
export { DealEvidenceWidget }
