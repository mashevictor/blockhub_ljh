import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'flutter_tool_router.dart';

class FlutterToolPage extends StatelessWidget {
  const FlutterToolPage({super.key, required this.branding, required this.capabilityKey});

  final AppBranding branding;
  final String capabilityKey;

  @override
  Widget build(BuildContext context) {
    return buildFlutterToolPage(capabilityKey: capabilityKey, branding: branding);
  }
}
