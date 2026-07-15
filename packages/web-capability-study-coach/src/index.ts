import { registerWidget } from '@blockhub/web-core'
import { StudyCoachWidget } from './StudyCoachWidget'

registerWidget('StudyCoachWidget', StudyCoachWidget as Parameters<typeof registerWidget>[1])
export { StudyCoachWidget }
