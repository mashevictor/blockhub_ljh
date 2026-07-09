import { registerWidget } from '@blockhub/web-core'

import { FormWidget, ApprovalInboxWidget, ListWidget } from './ApprovalWidgets'

// 自注册：导入即向 web-core 注册，无需在 runtime-web 渲染器中硬编码。
registerWidget('FormWidget', FormWidget as Parameters<typeof registerWidget>[1])
registerWidget('ApprovalInboxWidget', ApprovalInboxWidget as Parameters<typeof registerWidget>[1])
registerWidget('ListWidget', ListWidget as Parameters<typeof registerWidget>[1])

export { FormWidget, ApprovalInboxWidget, ListWidget }
