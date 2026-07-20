import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'kill_pipeline_page.dart';

class KillPipelineModule implements CapabilityModule {
  const KillPipelineModule();
  @override
  String get capabilityKey => 'kill_pipeline';
  @override
  Widget buildPage(AppBranding branding) => KillPipelinePage(branding: branding);
}
