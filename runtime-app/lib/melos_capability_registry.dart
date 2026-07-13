import 'package:capability_approval_flow/capability_approval_flow.dart';
import 'package:capability_audit_log/capability_audit_log.dart';
import 'package:capability_chat_qa/capability_chat_qa.dart';
import 'package:capability_dashboard/capability_dashboard.dart';
import 'package:capability_data_nl_query/capability_data_nl_query.dart';
import 'package:capability_integration/capability_integration.dart';
import 'package:capability_kb/capability_kb.dart';
import 'package:capability_multi_agent/capability_multi_agent.dart';
import 'package:capability_security_mask/capability_security_mask.dart';
import 'package:capability_shanghai_voice/capability_shanghai_voice.dart';
import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/widgets.dart';

/// P1 · Melos 能力模块注册表（runtime-app 聚合各 package）。
final List<CapabilityModule> melosCapabilityModules = const [
  ChatQaModule(),
  ApprovalFlowModule(),
  AuditLogModule(),
  ShanghaiVoiceModule(),
  KbModule(),
  DashboardModule(),
  DataNlQueryModule(),
  IntegrationModule(),
  MultiAgentModule(),
  SecurityMaskModule(),
];

const _chatKeys = {
  'chat_qa',
  'chat_voice',
  'chat_summary',
  'chat',
};

const _approvalKeys = {
  'approval_flow',
  'approval_inbox',
  'approval',
  'approval_countersign',
  'approval_conditional',
  'approval_remind',
  'approval_esign',
  'form_widget',
  'list_widget',
  'contract_editor',
  'contract_esign',
};

const _voiceKeys = {
  'shanghai_voice',
  'shanghai_voice_stream',
  'flutter_speech',
};

final Map<String, CapabilityModule> melosModuleByKey = _buildModuleMap();

Map<String, CapabilityModule> _buildModuleMap() {
  const chat = ChatQaModule();
  const approval = ApprovalFlowModule();
  const audit = AuditLogModule();
  const voice = ShanghaiVoiceModule();
  const kb = KbModule();
  const dashboard = DashboardModule();
  const nlQuery = DataNlQueryModule();
  const multiAgent = MultiAgentModule();
  const securityMask = SecurityMaskModule();

  final map = <String, CapabilityModule>{
    for (final m in melosCapabilityModules) m.capabilityKey: m,
    for (final k in _chatKeys) k: chat,
    for (final k in _approvalKeys) k: approval,
    for (final k in _voiceKeys) k: voice,
    'kb_search': kb,
    for (final k in dashboardCapabilityKeys) k: dashboard,
    for (final k in integrationCapabilityKeys)
      k: IntegrationModule(capabilityKey: k),
    'multi_agent': multiAgent,
    'audit_log': audit,
    'security_mask': securityMask,
    'data_nl_query': nlQuery,
  };
  return map;
}

Widget? buildMelosCapabilityPage({
  required String key,
  required AppBranding branding,
}) {
  final mod = melosModuleByKey[key];
  if (mod == null) return null;
  return mod.buildPage(branding);
}
