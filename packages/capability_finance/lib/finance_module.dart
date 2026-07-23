import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'finance_ops_page.dart';

const financeCapabilityKeys = {
  'finance_kyc',
  'finance_aml',
  'credit_approval',
  'due_diligence',
  'regulatory_report',
  'insurance_case',
};

bool isFinanceCapabilityKey(String key) => financeCapabilityKeys.contains(key);

class FinanceModule implements CapabilityModule {
  const FinanceModule({this.capabilityKey = 'finance_kyc'});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) =>
      FinanceOpsPage(branding: branding, kind: capabilityKey);
}
