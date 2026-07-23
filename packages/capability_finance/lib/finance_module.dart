import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'finance_news_page.dart';
import 'finance_ops_page.dart';

const financeCapabilityKeys = {
  'finance_kyc',
  'finance_aml',
  'credit_approval',
  'due_diligence',
  'regulatory_report',
  'insurance_case',
  'finance_news',
};

bool isFinanceCapabilityKey(String key) => financeCapabilityKeys.contains(key);

class FinanceModule implements CapabilityModule {
  const FinanceModule({this.capabilityKey = 'finance_kyc', this.vertical = 'bank'});

  @override
  final String capabilityKey;

  /// 五垂直过滤：bank|securities|insurance|fund|fintech
  final String vertical;

  @override
  Widget buildPage(AppBranding branding) {
    if (capabilityKey == 'finance_news') {
      return FinanceNewsPage(branding: branding, vertical: vertical);
    }
    return FinanceOpsPage(branding: branding, kind: capabilityKey);
  }
}
