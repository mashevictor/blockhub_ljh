import 'package:flutter/material.dart';

import '../config/app_branding.dart';
import '../data/capability_manifest.dart';
import 'approval_page.dart';
import 'chat_page.dart';
import 'capability_pages.dart';
import 'integration_hub_page.dart';
import 'nl_query_page.dart';
import 'report_page.dart';
import 'shanghai_voice_page.dart';

/// 按 manifest.widget 类型解析页面，补充 capabilityPages 别名表。
Widget buildCapabilityPage({
  required String key,
  required AppBranding branding,
}) {
  final explicit = capabilityPages[key];
  if (explicit != null) return explicit(branding);

  final entry = capabilityManifestByKey[key];
  if (entry != null) {
    switch (entry.widget) {
      case 'ShanghaiVoiceWidget':
      case 'VoiceStreamWidget':
        return ShanghaiVoicePage(branding: branding);
      case 'ChatWidget':
      case 'VoiceWidget':
      case 'MultiAgentWidget':
      case 'SummaryWidget':
        return ChatPage(branding: branding);
      case 'FormWidget':
      case 'ListWidget':
      case 'ApprovalInboxWidget':
        return ApprovalPage(branding: branding);
      case 'DashboardWidget':
      case 'FunnelWidget':
      case 'InboxWidget':
      case 'EmailWidget':
      case 'MobileChartWidget':
        return ReportPage(branding: branding);
      case 'NLQueryWidget':
        return NLQueryPage(branding: branding);
      case 'ERPWidget':
      case 'MeetingWidget':
      case 'HelpdeskWidget':
      case 'AssetWidget':
      case 'IMWidget':
      case 'RBACWidget':
      case 'OAWidget':
      case 'SSOWidget':
        return IntegrationHubPage(branding: branding, capabilityKey: key);
    }
  }

  final label = entry?.name ?? key;
  return Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text('「$label」页面建设中', textAlign: TextAlign.center),
    ),
  );
}

/// 首屏 capability_key：manifest 顺序优先，voiceDemo 仅在没有其他能力时生效。
String? pickInitialCapabilityKey({
  required List<String> manifestKeys,
  required List<String> menuKeys,
  required List<String> buildKeys,
}) {
  Iterable<String> effective = manifestKeys;
  if (buildKeys.isNotEmpty) {
    effective = manifestKeys.where(buildKeys.contains);
  }
  final ordered = effective.toList();
  if (ordered.isNotEmpty) return ordered.first;
  if (menuKeys.isNotEmpty) return menuKeys.first;
  return null;
}

const _voiceOnlyKeys = {
  'shanghai_voice',
  'shanghai_voice_stream',
  'chat_voice',
  'flutter_speech',
};

/// 是否直接进入上海话语音全屏壳（不经 Tab）。
bool shouldUseVoiceDemoShell(AppBranding branding, List<String> manifestKeys) {
  if (!branding.voiceDemoMode) return false;
  if (branding.capabilityKeys.isEmpty && manifestKeys.isEmpty) return true;
  final keys = branding.capabilityKeys.isNotEmpty
      ? branding.capabilityKeys
      : manifestKeys;
  if (keys.isEmpty) return true;
  return keys.every(_voiceOnlyKeys.contains);
}
