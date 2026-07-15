import { registerWidget } from '@blockhub/web-core'
import { PropertyRepairWidget } from './PropertyRepairWidget'

registerWidget('PropertyRepairWidget', PropertyRepairWidget as Parameters<typeof registerWidget>[1])
export { PropertyRepairWidget }
