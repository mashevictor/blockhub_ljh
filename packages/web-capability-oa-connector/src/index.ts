import { registerWidget } from '@blockhub/web-core'

import { default as OAWidget } from './OAWidget'

registerWidget('OAWidget', OAWidget as Parameters<typeof registerWidget>[1])

export { OAWidget }
