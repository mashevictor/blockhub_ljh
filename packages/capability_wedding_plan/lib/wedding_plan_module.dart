import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'wedding_plan_page.dart';

class WeddingPlanModule implements CapabilityModule {
  const WeddingPlanModule();
  @override
  String get capabilityKey => 'wedding_plan';
  @override
  Widget buildPage(AppBranding branding) => WeddingPlanPage(branding: branding);
}
