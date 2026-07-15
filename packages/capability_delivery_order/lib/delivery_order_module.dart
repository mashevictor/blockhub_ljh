import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'delivery_order_page.dart';

class DeliveryOrderModule implements CapabilityModule {
  const DeliveryOrderModule();
  @override
  String get capabilityKey => 'delivery_order';
  @override
  Widget buildPage(AppBranding branding) => DeliveryOrderPage(branding: branding);
}
