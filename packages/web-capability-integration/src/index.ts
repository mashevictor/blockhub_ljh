import { registerWidget } from '@blockhub/web-core'

import {
  AssetWidget,
  ERPWidget,
  HelpdeskWidget,
  IMWidget,
  MeetingWidget,
  RBACWidget,
} from './IntegrationWidgets'

registerWidget('ERPWidget', ERPWidget as Parameters<typeof registerWidget>[1])
registerWidget('MeetingWidget', MeetingWidget as Parameters<typeof registerWidget>[1])
registerWidget('HelpdeskWidget', HelpdeskWidget as Parameters<typeof registerWidget>[1])
registerWidget('AssetWidget', AssetWidget as Parameters<typeof registerWidget>[1])
registerWidget('IMWidget', IMWidget as Parameters<typeof registerWidget>[1])
registerWidget('RBACWidget', RBACWidget as Parameters<typeof registerWidget>[1])

export { AssetWidget, ERPWidget, HelpdeskWidget, IMWidget, MeetingWidget, RBACWidget }
