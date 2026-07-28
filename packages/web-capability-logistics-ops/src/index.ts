import { registerWidget } from '@blockhub/web-core'
import {
import './locales'
  ColdChainAlertWidget,
  DockQueueWidget,
  FleetDispatchWidget,
  FreightSettleWidget,
  LogisticsExceptionWidget,
  PodSignoffWidget,
  RouteTaskWidget,
  WarehouseInboundWidget,
  WarehouseOutboundWidget,
  WaybillTrackWidget,
} from './LogisticsOpsWidgets'

registerWidget('WaybillTrackWidget', WaybillTrackWidget as Parameters<typeof registerWidget>[1])
registerWidget('WarehouseInboundWidget', WarehouseInboundWidget as Parameters<typeof registerWidget>[1])
registerWidget('WarehouseOutboundWidget', WarehouseOutboundWidget as Parameters<typeof registerWidget>[1])
registerWidget('FleetDispatchWidget', FleetDispatchWidget as Parameters<typeof registerWidget>[1])
registerWidget('PodSignoffWidget', PodSignoffWidget as Parameters<typeof registerWidget>[1])
registerWidget('LogisticsExceptionWidget', LogisticsExceptionWidget as Parameters<typeof registerWidget>[1])
registerWidget('FreightSettleWidget', FreightSettleWidget as Parameters<typeof registerWidget>[1])
registerWidget('ColdChainAlertWidget', ColdChainAlertWidget as Parameters<typeof registerWidget>[1])
registerWidget('DockQueueWidget', DockQueueWidget as Parameters<typeof registerWidget>[1])
registerWidget('RouteTaskWidget', RouteTaskWidget as Parameters<typeof registerWidget>[1])

export {
  WaybillTrackWidget,
  WarehouseInboundWidget,
  WarehouseOutboundWidget,
  FleetDispatchWidget,
  PodSignoffWidget,
  LogisticsExceptionWidget,
  FreightSettleWidget,
  ColdChainAlertWidget,
  DockQueueWidget,
  RouteTaskWidget,
}
