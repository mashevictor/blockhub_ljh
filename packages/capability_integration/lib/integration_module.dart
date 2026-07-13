import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'integration_hub_page.dart';

const String integrationCapabilityKey = 'erp_connector';

const integrationCapabilityKeys = {
  'erp_connector',
  'oa_connector',
  'meeting_booking',
  'it_helpdesk',
  'asset_manage',
  'im_connector',
  'notify_im',
  'rbac_page',
  'auth_sso',
};

bool isIntegrationCapabilityKey(String key) => integrationCapabilityKeys.contains(key);

class IntegrationModule implements CapabilityModule {
  const IntegrationModule({this.capabilityKey = integrationCapabilityKey});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) =>
      IntegrationHubPage(branding: branding, capabilityKey: capabilityKey);
}
