import { registerWidget } from '@blockhub/web-core'
import { NurseShiftWidget } from './NurseShiftWidget'

registerWidget('NurseShiftWidget', NurseShiftWidget as Parameters<typeof registerWidget>[1])
export { NurseShiftWidget }
