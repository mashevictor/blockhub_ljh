import { registerWidget } from '@blockhub/web-core'

import { default as ShanghaiVoiceWidget } from './ShanghaiVoiceWidget'

// 自注册：导入本包即向 web-core 注册，无需在 runtime-web 渲染器中硬编码。
// 注册名需与 schema 节点的 widget 名一致（见 web-core resolveWidgetName）。
registerWidget('ShanghaiVoiceWidget', ShanghaiVoiceWidget)

export { ShanghaiVoiceWidget }
