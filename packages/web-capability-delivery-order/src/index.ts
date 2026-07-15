import { registerWidget } from '@blockhub/web-core'
import { DeliveryOrderWidget } from './DeliveryOrderWidget'

registerWidget('DeliveryOrderWidget', DeliveryOrderWidget as Parameters<typeof registerWidget>[1])
export { DeliveryOrderWidget }
