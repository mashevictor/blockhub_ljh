import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'device_repair_page.dart';

const String deviceRepairCapabilityKey = 'device_repair';

class DeviceRepairModule implements CapabilityModule {
  const DeviceRepairModule();

  @override
  String get capabilityKey => deviceRepairCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => DeviceRepairPage(branding: branding);
}
