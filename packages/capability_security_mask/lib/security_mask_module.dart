import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'security_mask_page.dart';

const String securityMaskCapabilityKey = 'security_mask';

class SecurityMaskModule implements CapabilityModule {
  const SecurityMaskModule();

  @override
  String get capabilityKey => securityMaskCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => SecurityMaskPage(branding: branding);
}
