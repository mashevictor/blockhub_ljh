import { registerWidget } from '@blockhub/web-core'

import { default as DashboardWidget } from './DashboardWidget'

// 自注册：导入即向 web-core 注册，无需在 runtime-web 渲染器中硬编码。
registerWidget('DashboardWidget', DashboardWidget as Parameters<typeof registerWidget>[1])

export { DashboardWidget }
