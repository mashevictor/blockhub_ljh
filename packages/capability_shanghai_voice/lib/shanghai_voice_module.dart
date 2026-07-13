import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'shanghai_voice_page.dart';

const String shanghaiVoiceCapabilityKey = 'shanghai_voice';

class ShanghaiVoiceModule implements CapabilityModule {
  const ShanghaiVoiceModule();

  @override
  String get capabilityKey => shanghaiVoiceCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => ShanghaiVoicePage(branding: branding);
}
