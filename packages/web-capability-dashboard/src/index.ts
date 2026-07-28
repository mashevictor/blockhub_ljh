import { registerWidget } from '@blockhub/web-core'

import { default as DashboardWidget } from './DashboardWidget'
import { EmailWidget, FunnelWidget, InboxWidget } from './NotifyWidgets'

import './locales'
registerWidget('DashboardWidget', DashboardWidget as Parameters<typeof registerWidget>[1])
registerWidget('FunnelWidget', FunnelWidget as Parameters<typeof registerWidget>[1])
registerWidget('InboxWidget', InboxWidget as Parameters<typeof registerWidget>[1])
registerWidget('EmailWidget', EmailWidget as Parameters<typeof registerWidget>[1])

export { DashboardWidget, FunnelWidget, InboxWidget, EmailWidget }
