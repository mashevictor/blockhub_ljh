import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'member_loyalty_page.dart';

class MemberLoyaltyModule implements CapabilityModule {
  const MemberLoyaltyModule();
  @override
  String get capabilityKey => 'member_loyalty';
  @override
  Widget buildPage(AppBranding branding) => MemberLoyaltyPage(branding: branding);
}
