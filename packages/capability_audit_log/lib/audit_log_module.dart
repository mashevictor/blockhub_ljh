import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'audit_log_page.dart';

const String auditLogCapabilityKey = 'audit_log';

class AuditLogModule implements CapabilityModule {
  const AuditLogModule();

  @override
  String get capabilityKey => auditLogCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => AuditLogPage(branding: branding);
}
