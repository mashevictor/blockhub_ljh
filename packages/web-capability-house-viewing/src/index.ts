import { registerWidget } from '@blockhub/web-core'
import { HouseViewingWidget } from './HouseViewingWidget'

import './locales'
registerWidget('HouseViewingWidget', HouseViewingWidget as Parameters<typeof registerWidget>[1])
export { HouseViewingWidget }
