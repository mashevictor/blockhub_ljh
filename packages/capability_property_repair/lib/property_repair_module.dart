import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'property_repair_page.dart';

class PropertyRepairModule implements CapabilityModule {
  const PropertyRepairModule();
  @override
  String get capabilityKey => 'property_repair';
  @override
  Widget buildPage(AppBranding branding) => PropertyRepairPage(branding: branding);
}
