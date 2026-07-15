import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'class_schedule_page.dart';

class ClassScheduleModule implements CapabilityModule {
  const ClassScheduleModule();
  @override
  String get capabilityKey => 'class_schedule';
  @override
  Widget buildPage(AppBranding branding) => ClassSchedulePage(branding: branding);
}
