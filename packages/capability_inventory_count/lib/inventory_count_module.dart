import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'inventory_count_page.dart';

class InventoryCountModule implements CapabilityModule {
  const InventoryCountModule();
  @override
  String get capabilityKey => 'inventory_count';
  @override
  Widget buildPage(AppBranding branding) => InventoryCountPage(branding: branding);
}
