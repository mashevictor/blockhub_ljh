import { registerWidget } from '@blockhub/web-core'
import { PolicyQaWidget } from './PolicyQaWidget'

import './locales'
registerWidget('PolicyQaWidget', PolicyQaWidget as Parameters<typeof registerWidget>[1])
export { PolicyQaWidget }
