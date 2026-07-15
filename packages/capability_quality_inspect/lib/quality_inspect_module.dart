import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'quality_inspect_page.dart';

class QualityInspectModule implements CapabilityModule {
  const QualityInspectModule();
  @override
  String get capabilityKey => 'quality_inspect';
  @override
  Widget buildPage(AppBranding branding) => QualityInspectPage(branding: branding);
}
