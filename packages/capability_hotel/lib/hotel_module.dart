import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'hotel_ops_page.dart';

const hotelCapabilityKeys = {
  'guest_complaint',
  'food_purchase',
  'hygiene_check',
  'room_service',
  'banquet_order',
  'hotel_revenue',
  'fnb_order',
  'lost_found',
  'room_status',
  'hk_task',
  'minibar_charge',
  'concierge_req',
  'group_checkin',
  'night_audit',
  'table_reserve',
  'menu_86',
  'kitchen_waste',
  'allergen_note',
};

bool isHotelCapabilityKey(String key) => hotelCapabilityKeys.contains(key);

class HotelModule implements CapabilityModule {
  const HotelModule({this.capabilityKey = 'guest_complaint'});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) {
    return HotelOpsPage(branding: branding, kind: capabilityKey);
  }
}
