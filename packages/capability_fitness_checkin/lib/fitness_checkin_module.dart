import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'fitness_checkin_page.dart';

class FitnessCheckinModule implements CapabilityModule {
  const FitnessCheckinModule();
  @override
  String get capabilityKey => 'fitness_checkin';
  @override
  Widget buildPage(AppBranding branding) => FitnessCheckinPage(branding: branding);
}
