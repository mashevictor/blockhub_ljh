import { registerWidget } from '@blockhub/web-core'

import { default as ChatWidget } from './ChatWidget'

// 自注册：导入即向 web-core 注册，无需在 runtime-web 渲染器中硬编码。
registerWidget('ChatWidget', ChatWidget as Parameters<typeof registerWidget>[1])
// 兼容：chat_voice 节点 type=voice -> resolveWidgetName 返回 'VoiceWidget'
registerWidget('VoiceWidget', ChatWidget as Parameters<typeof registerWidget>[1])

export { ChatWidget }
