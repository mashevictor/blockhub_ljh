import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'nl_query_page.dart';

const String nlQueryCapabilityKey = 'data_nl_query';

class DataNlQueryModule implements CapabilityModule {
  const DataNlQueryModule();

  @override
  String get capabilityKey => nlQueryCapabilityKey;

  @override
  Widget buildPage(AppBranding branding) => NLQueryPage(branding: branding);
}
