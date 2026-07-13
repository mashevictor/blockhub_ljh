import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:capability_approval_flow/capability_approval_flow.dart';
import 'package:capability_audit_log/capability_audit_log.dart';
import 'package:capability_chat_qa/capability_chat_qa.dart';
import 'package:capability_shanghai_voice/capability_shanghai_voice.dart';
import 'package:flutter/widgets.dart';

import 'pages/shanghai_voice_page.dart';

/// M10 · Melos 能力模块注册表（runtime-app 聚合各 package）。
final List<CapabilityModule> melosCapabilityModules = const [
  ChatQaModule(),
  ApprovalFlowModule(),
  AuditLogModule(),
  ShanghaiVoiceModule(),
];

final Map<String, CapabilityModule> melosModuleByKey = {
  for (final m in melosCapabilityModules) m.capabilityKey: m,
};

void registerMelosCapabilityBridges() {
  capabilityModuleRegistry[shanghaiVoiceCapabilityKey] =
      (AppBranding branding) => ShanghaiVoicePage(branding: branding);
}

Widget? buildMelosCapabilityPage({
  required String key,
  required AppBranding branding,
}) {
  final mod = melosModuleByKey[key];
  if (mod == null) return null;
  return mod.buildPage(branding);
}
