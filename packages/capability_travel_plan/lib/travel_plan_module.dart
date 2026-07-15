import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'travel_plan_page.dart';

class TravelPlanModule implements CapabilityModule {
  const TravelPlanModule();
  @override
  String get capabilityKey => 'travel_plan';
  @override
  Widget buildPage(AppBranding branding) => TravelPlanPage(branding: branding);
}
