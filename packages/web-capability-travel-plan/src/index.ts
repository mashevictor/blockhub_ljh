import { registerWidget } from '@blockhub/web-core'
import { TravelPlanWidget } from './TravelPlanWidget'

registerWidget('TravelPlanWidget', TravelPlanWidget as Parameters<typeof registerWidget>[1])
export { TravelPlanWidget }
