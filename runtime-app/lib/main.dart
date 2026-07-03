import 'package:flutter/material.dart';

import 'app.dart';
import 'config/app_branding.dart';

void main() {
  final branding = AppBranding.fromEnvironment();
  runApp(RuntimeApp(branding: branding));
}
