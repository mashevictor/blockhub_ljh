import { registerWidget } from '@blockhub/web-core'
import { NurseShiftWidget } from './NurseShiftWidget'

import './locales'
registerWidget('NurseShiftWidget', NurseShiftWidget as Parameters<typeof registerWidget>[1])
export { NurseShiftWidget }
