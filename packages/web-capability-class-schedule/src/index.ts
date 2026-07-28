import { registerWidget } from '@blockhub/web-core'
import { ClassScheduleWidget } from './ClassScheduleWidget'

import './locales'
registerWidget('ClassScheduleWidget', ClassScheduleWidget as Parameters<typeof registerWidget>[1])
export { ClassScheduleWidget }
