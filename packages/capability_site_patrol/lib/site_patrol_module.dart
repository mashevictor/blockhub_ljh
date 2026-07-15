import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'site_patrol_page.dart';

class SitePatrolModule implements CapabilityModule {
  const SitePatrolModule();
  @override
  String get capabilityKey => 'site_patrol';
  @override
  Widget buildPage(AppBranding branding) => SitePatrolPage(branding: branding);
}
