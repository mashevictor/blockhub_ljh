import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'flutter_tool_page.dart';

const flutterToolCapabilityKeys = {
  'schedule_alarm',
  'flutter_push',
  'flutter_scan_qr',
  'flutter_geolocation',
  'flutter_camera',
  'flutter_map',
  'flutter_offline',
  'flutter_biometric',
  'flutter_signature',
  'flutter_file_picker',
  'flutter_pdf',
  'flutter_webview',
  'flutter_chart',
};

bool isFlutterToolCapabilityKey(String key) => flutterToolCapabilityKeys.contains(key);

class FlutterToolsModule implements CapabilityModule {
  const FlutterToolsModule({required this.capabilityKey});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) =>
      FlutterToolPage(branding: branding, capabilityKey: capabilityKey);
}
