import { registerWidget } from '@blockhub/web-core'

import { default as MaskWidget } from './MaskWidget'

import './locales'
registerWidget('MaskWidget', MaskWidget as Parameters<typeof registerWidget>[1])

export { MaskWidget }
