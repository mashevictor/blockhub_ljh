import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import '../capability_deferred_host.dart';
import '../melos_capability_registry.dart';
import 'generated_capability_screen.dart';

/// 按 manifest / capability_key 解析 Melos 能力页（P2 支持 deferred）。
Widget buildCapabilityPage({
  required String key,
  required AppBranding branding,
}) {
  if (shouldDeferCapabilityKey(key)) {
    return DeferredCapabilityHost(capabilityKey: key, branding: branding);
  }

  final fromMelos = buildMelosCapabilityPage(key: key, branding: branding);
  if (fromMelos != null) return fromMelos;

  // 未知 / AI 生成能力：通用占位壳（选型即交付 codegen MVP）
  return GeneratedCapabilityScreen(capabilityKey: key);
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
  // 沉浸对话壳 + 语音类能力 → 全屏上海话/语音页；其它能力走 Tab/抽屉壳
  if (branding.appUiId != 'immersive_chat' && !branding.voiceDemoMode) {
    return false;
  }
  final keys = branding.capabilityKeys.isNotEmpty
      ? branding.capabilityKeys
      : manifestKeys;
  if (keys.isEmpty) return branding.voiceDemoMode;
  return keys.any(_voiceOnlyKeys.contains);
}
