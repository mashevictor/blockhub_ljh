import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'deal_evidence_page.dart';

class DealEvidenceModule implements CapabilityModule {
  const DealEvidenceModule();
  @override
  String get capabilityKey => 'deal_evidence';
  @override
  Widget buildPage(AppBranding branding) => DealEvidencePage(branding: branding);
}
