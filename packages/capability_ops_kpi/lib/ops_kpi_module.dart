import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'ops_kpi_page.dart';

class OpsKpiModule implements CapabilityModule {
  const OpsKpiModule();
  @override
  String get capabilityKey => 'ops_kpi';
  @override
  Widget buildPage(AppBranding branding) => OpsKpiPage(branding: branding);
}
