import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'tools/biometric_tool_page.dart';
import 'tools/camera_tool_page.dart';
import 'tools/chart_tool_page.dart';
import 'tools/file_tool_page.dart';
import 'tools/geo_tool_page.dart';
import 'tools/map_tool_page.dart';
import 'tools/notification_tool_page.dart';
import 'tools/offline_tool_page.dart';
import 'tools/pdf_tool_page.dart';
import 'tools/scan_tool_page.dart';
import 'tools/signature_tool_page.dart';
import 'tools/webview_tool_page.dart';

/// 按 capability_key 路由到真设备工具页。
Widget buildFlutterToolPage({
  required String capabilityKey,
  required AppBranding branding,
}) {
  return switch (capabilityKey) {
    'flutter_scan_qr' => ScanToolPage(branding: branding),
    'flutter_geolocation' => GeoToolPage(branding: branding),
    'flutter_camera' => CameraToolPage(branding: branding),
    'flutter_file_picker' => FileToolPage(branding: branding),
    'flutter_biometric' => BiometricToolPage(branding: branding),
    'flutter_webview' => WebViewToolPage(branding: branding),
    'schedule_alarm' => AlarmToolPage(branding: branding),
    'flutter_push' => PushToolPage(branding: branding),
    'flutter_offline' => OfflineToolPage(branding: branding),
    'flutter_signature' => SignatureToolPage(branding: branding),
    'flutter_pdf' => PdfToolPage(branding: branding),
    'flutter_map' => MapToolPage(branding: branding),
    'flutter_chart' => ChartToolPage(branding: branding),
    _ => _UnknownToolPage(capabilityKey: capabilityKey, branding: branding),
  };
}

class _UnknownToolPage extends StatelessWidget {
  const _UnknownToolPage({required this.capabilityKey, required this.branding});

  final String capabilityKey;
  final AppBranding branding;

  @override
  Widget build(BuildContext context) {
    return Center(child: Text('未知工具能力: $capabilityKey'));
  }
}
