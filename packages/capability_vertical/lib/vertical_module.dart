import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'vertical_ops_page.dart';

const verticalCapabilityKeys = {'edu_grade_alert', 'edu_tuition', 'edu_attendance', 'edu_quiz', 'edu_textbook', 'edu_makeup', 'edu_transfer', 'energy_defect', 'energy_ticket', 'energy_spare', 'energy_emissions', 'energy_outage', 'energy_hotwork', 'energy_restore', 'gov_appeal', 'gov_grid', 'gov_license', 'gov_hotline', 'gov_supervise', 'gov_public', 'legal_filing', 'legal_evidence', 'legal_hearing', 'legal_contract_ops', 'legal_enforce', 'legal_preserve', 'hr_perf', 'hr_training', 'hr_headcount', 'hr_payroll', 'hr_offer', 'hr_idp', 'const_safety', 'const_accept', 'const_progress', 'const_visa', 'const_labor', 'agro_patrol', 'agro_subsidy', 'agro_inventory', 'agro_pest', 'agro_trace', 'media_review', 'media_calendar', 'media_topic', 'media_asset', 'media_live', 'auto_service', 'auto_fleet', 'auto_parts', 'auto_claim', 'auto_charge', 'mkt_lead', 'mkt_content', 'mkt_ab_test', 'mkt_roi', 'mkt_sign', 'mkt_coupon'};

bool isVerticalCapabilityKey(String key) => verticalCapabilityKeys.contains(key);

class VerticalModule implements CapabilityModule {
  const VerticalModule({this.capabilityKey = 'edu_grade_alert'});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) {
    return VerticalOpsPage(branding: branding, kind: capabilityKey);
  }
}
