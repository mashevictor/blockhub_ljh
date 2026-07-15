import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'med_triage_page.dart';

class MedTriageModule implements CapabilityModule {
  const MedTriageModule();
  @override
  String get capabilityKey => 'med_triage';
  @override
  Widget buildPage(AppBranding branding) => MedTriagePage(branding: branding);
}
