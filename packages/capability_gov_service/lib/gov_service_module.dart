import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'gov_service_page.dart';

class GovServiceModule implements CapabilityModule {
  const GovServiceModule();
  @override
  String get capabilityKey => 'gov_service';
  @override
  Widget buildPage(AppBranding branding) => GovServicePage(branding: branding);
}
