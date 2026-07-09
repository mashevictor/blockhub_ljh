import 'package:flutter/material.dart';

import '../config/app_branding.dart';
import 'shanghai_voice_page.dart';

/// 能力页面注册表：capability_key -> 页面构造器。
///
/// 解耦核心：新增一个 Flutter 能力模块，只需在本文件加 1 行映射，
/// 外壳（app.dart / _HomeBody）永远不再改动。
typedef CapabilityPageBuilder = Widget Function(AppBranding branding);

final Map<String, CapabilityPageBuilder> capabilityPages = {
  'shanghai_voice': (branding) => ShanghaiVoicePage(branding: branding),
};
