import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:capability_chat_qa/capability_chat_qa.dart';
import 'package:flutter/material.dart';

import 'multi_agent_page.dart';

import 'multi_agent_module.dart';

const String multiAgentCapabilityKey = 'multi_agent';

class MultiAgentModule implements CapabilityModule {
  const MultiAgentModule();

  @override
  String get capabilityKey => multiAgentCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => MultiAgentPage(branding: branding);
}
