import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import '../melos_capability_registry.dart';

/// 按 manifest / capability_key 解析 Melos 能力页。
Widget buildCapabilityPage({
  required String key,
  required AppBranding branding,
}) {
  final fromMelos = buildMelosCapabilityPage(key: key, branding: branding);
  if (fromMelos != null) return fromMelos;

  final label = key;
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
