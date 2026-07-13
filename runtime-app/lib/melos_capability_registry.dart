import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/widgets.dart';

import 'melos_capability_registry.g.dart';

Widget? buildMelosCapabilityPage({
  required String key,
  required AppBranding branding,
}) {
  final mod = generatedMelosModuleByKey[key];
  if (mod == null) return null;
  return mod.buildPage(branding);
}

List<CapabilityModule> get melosCapabilityModules => generatedMelosCapabilityModules;
