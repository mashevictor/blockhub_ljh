import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'homework_qa_page.dart';

class HomeworkQaModule implements CapabilityModule {
  const HomeworkQaModule();
  @override
  String get capabilityKey => 'homework_qa';
  @override
  Widget buildPage(AppBranding branding) => HomeworkQaPage(branding: branding);
}
