import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'config/app_branding.dart';

const _localePrefKey = 'blockhub.locale';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await BhL10n.instance.load();
  final prefs = await SharedPreferences.getInstance();
  final stored = prefs.getString(_localePrefKey);
  if (stored == BhL10n.enUS || stored == BhL10n.zhCN) {
    BhL10n.instance.setLocale(stored!);
  }
  BhL10n.instance.addListener(() {
    prefs.setString(_localePrefKey, BhL10n.instance.locale);
  });

  final pkg = await PackageInfo.fromPlatform();
  final branding = AppBranding.fromEnvironment().applyAndroidPackage(pkg.packageName);
  runApp(RuntimeApp(branding: branding));
}
