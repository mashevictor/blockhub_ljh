import { registerWidget } from '@blockhub/web-core'

import { default as NLQueryWidget } from './NLQueryWidget'

import './locales'
registerWidget('NLQueryWidget', NLQueryWidget as Parameters<typeof registerWidget>[1])

export { NLQueryWidget }
