import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'quote_contract_page.dart';

class QuoteContractModule implements CapabilityModule {
  const QuoteContractModule();
  @override
  String get capabilityKey => 'quote_contract';
  @override
  Widget buildPage(AppBranding branding) => QuoteContractPage(branding: branding);
}
