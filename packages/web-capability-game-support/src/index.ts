import { registerWidget } from '@blockhub/web-core'
import { GameSupportWidget } from './GameSupportWidget'

import './locales'
registerWidget('GameSupportWidget', GameSupportWidget as Parameters<typeof registerWidget>[1])
export { GameSupportWidget }
