import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'realestate_ops_page.dart';

const realestateCapabilityKeys = {
  'listing_publish',
  'rent_collection',
  'lease_renewal',
  'owner_complaint',
  'deco_acceptance',
  'sales_followup',
  're_contract',
  'viewing_feedback',
  'property_fee',
  'broker_commission',
};

bool isRealestateCapabilityKey(String key) => realestateCapabilityKeys.contains(key);

class RealestateModule implements CapabilityModule {
  const RealestateModule({this.capabilityKey = 'listing_publish'});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) {
    return RealestateOpsPage(branding: branding, kind: capabilityKey);
  }
}
