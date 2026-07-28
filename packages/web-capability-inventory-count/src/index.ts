import { registerWidget } from '@blockhub/web-core'
import { InventoryCountWidget } from './InventoryCountWidget'

import './locales'
registerWidget('InventoryCountWidget', InventoryCountWidget as Parameters<typeof registerWidget>[1])
export { InventoryCountWidget }
