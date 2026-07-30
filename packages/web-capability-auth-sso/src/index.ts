import { registerWidget } from '@blockhub/web-core'

import { default as SSOWidget } from './SSOWidget'

import './locales'
registerWidget('SSOWidget', SSOWidget as Parameters<typeof registerWidget>[1])

export { SSOWidget }
