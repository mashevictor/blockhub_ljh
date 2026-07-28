import { registerWidget } from '@blockhub/web-core'
import './locales'
import { LeaveRequestWidget } from './LeaveRequestWidget'

registerWidget('LeaveRequestWidget', LeaveRequestWidget as Parameters<typeof registerWidget>[1])
export { LeaveRequestWidget }
