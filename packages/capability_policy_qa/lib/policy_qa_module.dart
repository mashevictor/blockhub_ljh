import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'policy_qa_page.dart';

class PolicyQaModule implements CapabilityModule {
  const PolicyQaModule();
  @override
  String get capabilityKey => 'policy_qa';
  @override
  Widget buildPage(AppBranding branding) => PolicyQaPage(branding: branding);
}
