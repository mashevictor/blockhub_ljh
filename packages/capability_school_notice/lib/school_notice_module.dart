import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'school_notice_page.dart';

class SchoolNoticeModule implements CapabilityModule {
  const SchoolNoticeModule();
  @override
  String get capabilityKey => 'school_notice';
  @override
  Widget buildPage(AppBranding branding) => SchoolNoticePage(branding: branding);
}
