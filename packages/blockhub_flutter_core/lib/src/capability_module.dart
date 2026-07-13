import 'package:flutter/widgets.dart';

import 'app_branding.dart';

typedef CapabilityPageBuilder = Widget Function(AppBranding branding);

/// runtime-app 可向 Melos 包注入尚未迁出的重依赖页面（如 shanghai_voice）。
final Map<String, CapabilityPageBuilder> capabilityModuleRegistry = {};

abstract class CapabilityModule {
  String get capabilityKey;
  Widget buildPage(AppBranding branding);
}
