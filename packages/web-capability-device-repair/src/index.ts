import { registerWidget } from '@blockhub/web-core'

import { DeviceRepairWidget } from './DeviceRepairWidget'

registerWidget('DeviceRepairWidget', DeviceRepairWidget as Parameters<typeof registerWidget>[1])

export { DeviceRepairWidget }
