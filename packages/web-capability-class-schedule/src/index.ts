import { registerWidget } from '@blockhub/web-core'
import { ClassScheduleWidget } from './ClassScheduleWidget'

registerWidget('ClassScheduleWidget', ClassScheduleWidget as Parameters<typeof registerWidget>[1])
export { ClassScheduleWidget }
