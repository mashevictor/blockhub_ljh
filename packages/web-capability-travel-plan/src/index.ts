import { registerWidget } from '@blockhub/web-core'
import { TravelPlanWidget } from './TravelPlanWidget'

import './locales'
registerWidget('TravelPlanWidget', TravelPlanWidget as Parameters<typeof registerWidget>[1])
export { TravelPlanWidget }
