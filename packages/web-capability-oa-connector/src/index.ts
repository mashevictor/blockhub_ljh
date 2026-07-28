import { registerWidget } from '@blockhub/web-core'

import { default as OAWidget } from './OAWidget'

import './locales'
registerWidget('OAWidget', OAWidget as Parameters<typeof registerWidget>[1])

export { OAWidget }
