import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'sales_lead_page.dart';

class SalesLeadModule implements CapabilityModule {
  const SalesLeadModule();
  @override
  String get capabilityKey => 'sales_lead';
  @override
  Widget buildPage(AppBranding branding) => SalesLeadPage(branding: branding);
}
