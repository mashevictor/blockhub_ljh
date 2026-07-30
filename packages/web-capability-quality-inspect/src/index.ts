import { registerWidget } from '@blockhub/web-core'
import { QualityInspectWidget } from './QualityInspectWidget'

import './locales'
registerWidget('QualityInspectWidget', QualityInspectWidget as Parameters<typeof registerWidget>[1])
export { QualityInspectWidget }
