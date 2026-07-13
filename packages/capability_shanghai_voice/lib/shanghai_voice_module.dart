import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const String shanghaiVoiceCapabilityKey = 'shanghai_voice';

/// 语音页仍含 record/PCM 依赖，由 runtime-app 启动时 registerCapabilityModule 注入。
class ShanghaiVoiceModule implements CapabilityModule {
  const ShanghaiVoiceModule();

  @override
  String get capabilityKey => shanghaiVoiceCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) {
    final builder = capabilityModuleRegistry[shanghaiVoiceCapabilityKey];
    if (builder != null) {
      return builder(branding);
    }
    return const Center(child: Text('shanghai_voice 模块未注册'));
  }
}
