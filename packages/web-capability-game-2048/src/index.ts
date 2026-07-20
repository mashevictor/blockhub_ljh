import { registerWidget } from '@blockhub/web-core'
import { Game2048Widget } from './Game2048Widget'

registerWidget('Game2048Widget', Game2048Widget as Parameters<typeof registerWidget>[1])
export { Game2048Widget }
