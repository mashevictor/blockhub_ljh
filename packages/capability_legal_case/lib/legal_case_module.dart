import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'legal_case_page.dart';

class LegalCaseModule implements CapabilityModule {
  const LegalCaseModule();
  @override
  String get capabilityKey => 'legal_case';
  @override
  Widget buildPage(AppBranding branding) => LegalCasePage(branding: branding);
}
