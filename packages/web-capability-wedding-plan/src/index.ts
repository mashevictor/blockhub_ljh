import { registerWidget } from '@blockhub/web-core'
import { WeddingPlanWidget } from './WeddingPlanWidget'

import './locales'
registerWidget('WeddingPlanWidget', WeddingPlanWidget as Parameters<typeof registerWidget>[1])
export { WeddingPlanWidget }
