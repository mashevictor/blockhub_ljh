import { registerWidget } from '@blockhub/web-core'

import { default as ChatWidget } from './ChatWidget'
import { default as SummaryWidget } from './SummaryWidget'

registerWidget('ChatWidget', ChatWidget as Parameters<typeof registerWidget>[1])
registerWidget('VoiceWidget', ChatWidget as Parameters<typeof registerWidget>[1])
registerWidget('SummaryWidget', SummaryWidget as Parameters<typeof registerWidget>[1])

export { ChatWidget, SummaryWidget }
