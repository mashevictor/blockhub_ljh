import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'approval_page.dart';

const String approvalFlowCapabilityKey = 'approval_flow';

class ApprovalFlowModule implements CapabilityModule {
  const ApprovalFlowModule();

  @override
  String get capabilityKey => approvalFlowCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => ApprovalPage(branding: branding);
}
