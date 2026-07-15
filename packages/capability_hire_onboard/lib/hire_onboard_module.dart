import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'hire_onboard_page.dart';

class HireOnboardModule implements CapabilityModule {
  const HireOnboardModule();
  @override
  String get capabilityKey => 'hire_onboard';
  @override
  Widget buildPage(AppBranding branding) => HireOnboardPage(branding: branding);
}
