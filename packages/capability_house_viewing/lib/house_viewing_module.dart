import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'house_viewing_page.dart';

class HouseViewingModule implements CapabilityModule {
  const HouseViewingModule();
  @override
  String get capabilityKey => 'house_viewing';
  @override
  Widget buildPage(AppBranding branding) => HouseViewingPage(branding: branding);
}
