import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'leave_request_page.dart';

class LeaveRequestModule implements CapabilityModule {
  const LeaveRequestModule();
  @override
  String get capabilityKey => 'leave_request';
  @override
  Widget buildPage(AppBranding branding) => LeaveRequestPage(branding: branding);
}
