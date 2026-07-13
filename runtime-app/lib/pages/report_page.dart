import 'package:capability_dashboard/dashboard_page.dart';

export 'package:capability_dashboard/dashboard_page.dart' show DashboardPage;

/// 兼容旧名。
class ReportPage extends DashboardPage {
  const ReportPage({super.key, required super.branding});
}
