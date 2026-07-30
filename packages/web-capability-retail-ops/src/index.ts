import { registerWidget } from '@blockhub/web-core'
import './locales'
import {
  StockAlertWidget,
  RetailOrderWidget,
  ReturnExchangeWidget,
  SupplierReconWidget,
  PriceChangeWidget,
  DisplayCheckWidget,
  ShelfReplenishWidget,
  PosExceptionWidget,
  StoreTransferWidget,
  LossShrinkageWidget,
  OmniPickupWidget,
  PromoCouponWidget,
  GiftCardWidget,
  CompetitorPriceWidget,
  NewSkuLaunchWidget,
  VipHoldWidget,
  ReceiptAuditWidget,
  OnlineRefundWidget,
} from './RetailOpsWidgets'

registerWidget('StockAlertWidget', StockAlertWidget as Parameters<typeof registerWidget>[1])
registerWidget('RetailOrderWidget', RetailOrderWidget as Parameters<typeof registerWidget>[1])
registerWidget('ReturnExchangeWidget', ReturnExchangeWidget as Parameters<typeof registerWidget>[1])
registerWidget('SupplierReconWidget', SupplierReconWidget as Parameters<typeof registerWidget>[1])
registerWidget('PriceChangeWidget', PriceChangeWidget as Parameters<typeof registerWidget>[1])
registerWidget('DisplayCheckWidget', DisplayCheckWidget as Parameters<typeof registerWidget>[1])
registerWidget('ShelfReplenishWidget', ShelfReplenishWidget as Parameters<typeof registerWidget>[1])
registerWidget('PosExceptionWidget', PosExceptionWidget as Parameters<typeof registerWidget>[1])
registerWidget('StoreTransferWidget', StoreTransferWidget as Parameters<typeof registerWidget>[1])
registerWidget('LossShrinkageWidget', LossShrinkageWidget as Parameters<typeof registerWidget>[1])
registerWidget('OmniPickupWidget', OmniPickupWidget as Parameters<typeof registerWidget>[1])
registerWidget('PromoCouponWidget', PromoCouponWidget as Parameters<typeof registerWidget>[1])
registerWidget('GiftCardWidget', GiftCardWidget as Parameters<typeof registerWidget>[1])
registerWidget('CompetitorPriceWidget', CompetitorPriceWidget as Parameters<typeof registerWidget>[1])
registerWidget('NewSkuLaunchWidget', NewSkuLaunchWidget as Parameters<typeof registerWidget>[1])
registerWidget('VipHoldWidget', VipHoldWidget as Parameters<typeof registerWidget>[1])
registerWidget('ReceiptAuditWidget', ReceiptAuditWidget as Parameters<typeof registerWidget>[1])
registerWidget('OnlineRefundWidget', OnlineRefundWidget as Parameters<typeof registerWidget>[1])

export {
  StockAlertWidget,
  RetailOrderWidget,
  ReturnExchangeWidget,
  SupplierReconWidget,
  PriceChangeWidget,
  DisplayCheckWidget,
  ShelfReplenishWidget,
  PosExceptionWidget,
  StoreTransferWidget,
  LossShrinkageWidget,
  OmniPickupWidget,
  PromoCouponWidget,
  GiftCardWidget,
  CompetitorPriceWidget,
  NewSkuLaunchWidget,
  VipHoldWidget,
  ReceiptAuditWidget,
  OnlineRefundWidget,
}
