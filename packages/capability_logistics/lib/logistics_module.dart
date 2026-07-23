import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'logistics_ops_page.dart';

const logisticsCapabilityKeys = {
  'waybill_track',
  'warehouse_inbound',
  'warehouse_outbound',
  'fleet_dispatch',
  'pod_signoff',
  'logistics_exception',
  'freight_settle',
  'cold_chain_alert',
  'dock_queue',
  'route_task',
};

bool isLogisticsCapabilityKey(String key) => logisticsCapabilityKeys.contains(key);

class LogisticsModule implements CapabilityModule {
  const LogisticsModule({this.capabilityKey = 'waybill_track'});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) {
    return LogisticsOpsPage(branding: branding, kind: capabilityKey);
  }
}
