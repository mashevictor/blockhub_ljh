import { registerWidget } from '@blockhub/web-core'
import { HomeworkQaWidget } from './HomeworkQaWidget'

import './locales'
registerWidget('HomeworkQaWidget', HomeworkQaWidget as Parameters<typeof registerWidget>[1])
export { HomeworkQaWidget }
