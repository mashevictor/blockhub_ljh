import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'study_coach_page.dart';

class StudyCoachModule implements CapabilityModule {
  const StudyCoachModule();
  @override
  String get capabilityKey => 'study_coach';
  @override
  Widget buildPage(AppBranding branding) => StudyCoachPage(branding: branding);
}
