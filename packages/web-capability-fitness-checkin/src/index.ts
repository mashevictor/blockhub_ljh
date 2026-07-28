import { registerWidget } from '@blockhub/web-core'
import { FitnessCheckinWidget } from './FitnessCheckinWidget'

import './locales'
registerWidget('FitnessCheckinWidget', FitnessCheckinWidget as Parameters<typeof registerWidget>[1])
export { FitnessCheckinWidget }
