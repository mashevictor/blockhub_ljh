import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'app.dart';
import 'config/app_branding.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final pkg = await PackageInfo.fromPlatform();
  final branding = AppBranding.fromEnvironment().applyAndroidPackage(pkg.packageName);
  runApp(RuntimeApp(branding: branding));
}
