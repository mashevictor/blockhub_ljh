import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'expense_claim_page.dart';

class ExpenseClaimModule implements CapabilityModule {
  const ExpenseClaimModule();
  @override
  String get capabilityKey => 'expense_claim';
  @override
  Widget buildPage(AppBranding branding) => ExpenseClaimPage(branding: branding);
}
