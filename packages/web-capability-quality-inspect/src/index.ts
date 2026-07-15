import { registerWidget } from '@blockhub/web-core'
import { QualityInspectWidget } from './QualityInspectWidget'

registerWidget('QualityInspectWidget', QualityInspectWidget as Parameters<typeof registerWidget>[1])
export { QualityInspectWidget }
