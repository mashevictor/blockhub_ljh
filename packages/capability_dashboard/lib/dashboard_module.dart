import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'dashboard_page.dart';

const String dashboardCapabilityKey = 'chart_dashboard';

const dashboardCapabilityKeys = {
  'chart_dashboard',
  'chart_funnel',
  'chart_line',
  'chart_bar',
  'notify_inapp',
  'notify_email',
  'report_scheduled',
  'data_export',
  'announce_board',
};

bool isDashboardCapabilityKey(String key) => dashboardCapabilityKeys.contains(key);

class DashboardModule implements CapabilityModule {
  const DashboardModule();

  @override
  String get capabilityKey => dashboardCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => DashboardPage(branding: branding);
}
