import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'retail_ops_page.dart';

const retailCapabilityKeys = {
  'stock_alert',
  'retail_order',
  'return_exchange',
  'supplier_recon',
  'price_change',
  'display_check',
  'shelf_replenish',
  'pos_exception',
  'store_transfer',
  'loss_shrinkage',
  'omni_pickup',
  'promo_coupon',
  'gift_card',
  'competitor_price',
  'new_sku_launch',
  'vip_hold',
  'receipt_audit',
  'online_refund',
};

bool isRetailCapabilityKey(String key) => retailCapabilityKeys.contains(key);

class RetailModule implements CapabilityModule {
  const RetailModule({this.capabilityKey = 'stock_alert'});

  @override
  final String capabilityKey;

  @override
  Widget buildPage(AppBranding branding) {
    return RetailOpsPage(branding: branding, kind: capabilityKey);
  }
}
