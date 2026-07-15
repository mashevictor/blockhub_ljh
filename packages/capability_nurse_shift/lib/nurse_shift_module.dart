import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'nurse_shift_page.dart';

class NurseShiftModule implements CapabilityModule {
  const NurseShiftModule();
  @override
  String get capabilityKey => 'nurse_shift';
  @override
  Widget buildPage(AppBranding branding) => NurseShiftPage(branding: branding);
}
