import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'game_support_page.dart';

class GameSupportModule implements CapabilityModule {
  const GameSupportModule();
  @override
  String get capabilityKey => 'game_support';
  @override
  Widget buildPage(AppBranding branding) => GameSupportPage(branding: branding);
}
