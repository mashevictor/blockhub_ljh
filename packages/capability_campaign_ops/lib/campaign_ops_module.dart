import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'campaign_ops_page.dart';

class CampaignOpsModule implements CapabilityModule {
  const CampaignOpsModule();
  @override
  String get capabilityKey => 'campaign_ops';
  @override
  Widget buildPage(AppBranding branding) => CampaignOpsPage(branding: branding);
}
