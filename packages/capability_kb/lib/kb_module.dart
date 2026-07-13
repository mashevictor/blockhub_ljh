import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'kb_page.dart';

const String kbCapabilityKey = 'kb_document';

class KbModule implements CapabilityModule {
  const KbModule();

  @override
  String get capabilityKey => kbCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => KbPage(branding: branding);
}
