import { registerWidget } from '@blockhub/web-core'
import { InventoryCountWidget } from './InventoryCountWidget'

registerWidget('InventoryCountWidget', InventoryCountWidget as Parameters<typeof registerWidget>[1])
export { InventoryCountWidget }
