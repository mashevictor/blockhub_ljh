import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'deco_material_page.dart';

class DecoMaterialModule implements CapabilityModule {
  const DecoMaterialModule();
  @override
  String get capabilityKey => 'deco_material';
  @override
  Widget buildPage(AppBranding branding) => DecoMaterialPage(branding: branding);
}
