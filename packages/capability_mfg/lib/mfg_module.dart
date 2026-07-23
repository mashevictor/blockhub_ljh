import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'mfg_ops_page.dart';

const mfgCapabilityKeys = {
  'mfg_oee',
  'material_issue',
  'maintenance_plan',
  'shift_attendance',
  'energy_carbon',
  'training_record',
};

bool isMfgCapabilityKey(String key) => mfgCapabilityKeys.contains(key);

class MfgModule implements CapabilityModule {
  const MfgModule({this.capabilityKey = 'mfg_oee'});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) {
    return MfgOpsPage(branding: branding, kind: capabilityKey);
  }
}
