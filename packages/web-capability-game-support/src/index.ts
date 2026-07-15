import { registerWidget } from '@blockhub/web-core'
import { GameSupportWidget } from './GameSupportWidget'

registerWidget('GameSupportWidget', GameSupportWidget as Parameters<typeof registerWidget>[1])
export { GameSupportWidget }
