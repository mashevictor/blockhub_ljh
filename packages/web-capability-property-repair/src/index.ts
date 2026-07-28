import { registerWidget } from '@blockhub/web-core'
import { PropertyRepairWidget } from './PropertyRepairWidget'

import './locales'
registerWidget('PropertyRepairWidget', PropertyRepairWidget as Parameters<typeof registerWidget>[1])
export { PropertyRepairWidget }
