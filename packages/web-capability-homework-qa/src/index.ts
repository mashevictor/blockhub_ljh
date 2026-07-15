import { registerWidget } from '@blockhub/web-core'
import { HomeworkQaWidget } from './HomeworkQaWidget'

registerWidget('HomeworkQaWidget', HomeworkQaWidget as Parameters<typeof registerWidget>[1])
export { HomeworkQaWidget }
