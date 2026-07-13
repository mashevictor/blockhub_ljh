import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'chat_page.dart';

const String chatQaCapabilityKey = 'chat_qa';

class ChatQaModule implements CapabilityModule {
  const ChatQaModule();

  @override
  String get capabilityKey => chatQaCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => ChatPage(branding: branding);
}
