import { registerWidget } from '@blockhub/web-core'
import {
import './locales'
  GuestComplaintWidget,
  FoodPurchaseWidget,
  HygieneCheckWidget,
  RoomServiceWidget,
  BanquetOrderWidget,
  HotelRevenueWidget,
  FnbOrderWidget,
  LostFoundWidget,
  RoomStatusWidget,
  HkTaskWidget,
  MinibarChargeWidget,
  ConciergeReqWidget,
  GroupCheckinWidget,
  NightAuditWidget,
  TableReserveWidget,
  Menu86Widget,
  KitchenWasteWidget,
  AllergenNoteWidget,
} from './HotelOpsWidgets'

registerWidget('GuestComplaintWidget', GuestComplaintWidget as Parameters<typeof registerWidget>[1])
registerWidget('FoodPurchaseWidget', FoodPurchaseWidget as Parameters<typeof registerWidget>[1])
registerWidget('HygieneCheckWidget', HygieneCheckWidget as Parameters<typeof registerWidget>[1])
registerWidget('RoomServiceWidget', RoomServiceWidget as Parameters<typeof registerWidget>[1])
registerWidget('BanquetOrderWidget', BanquetOrderWidget as Parameters<typeof registerWidget>[1])
registerWidget('HotelRevenueWidget', HotelRevenueWidget as Parameters<typeof registerWidget>[1])
registerWidget('FnbOrderWidget', FnbOrderWidget as Parameters<typeof registerWidget>[1])
registerWidget('LostFoundWidget', LostFoundWidget as Parameters<typeof registerWidget>[1])
registerWidget('RoomStatusWidget', RoomStatusWidget as Parameters<typeof registerWidget>[1])
registerWidget('HkTaskWidget', HkTaskWidget as Parameters<typeof registerWidget>[1])
registerWidget('MinibarChargeWidget', MinibarChargeWidget as Parameters<typeof registerWidget>[1])
registerWidget('ConciergeReqWidget', ConciergeReqWidget as Parameters<typeof registerWidget>[1])
registerWidget('GroupCheckinWidget', GroupCheckinWidget as Parameters<typeof registerWidget>[1])
registerWidget('NightAuditWidget', NightAuditWidget as Parameters<typeof registerWidget>[1])
registerWidget('TableReserveWidget', TableReserveWidget as Parameters<typeof registerWidget>[1])
registerWidget('Menu86Widget', Menu86Widget as Parameters<typeof registerWidget>[1])
registerWidget('KitchenWasteWidget', KitchenWasteWidget as Parameters<typeof registerWidget>[1])
registerWidget('AllergenNoteWidget', AllergenNoteWidget as Parameters<typeof registerWidget>[1])

export {
  GuestComplaintWidget,
  FoodPurchaseWidget,
  HygieneCheckWidget,
  RoomServiceWidget,
  BanquetOrderWidget,
  HotelRevenueWidget,
  FnbOrderWidget,
  LostFoundWidget,
  RoomStatusWidget,
  HkTaskWidget,
  MinibarChargeWidget,
  ConciergeReqWidget,
  GroupCheckinWidget,
  NightAuditWidget,
  TableReserveWidget,
  Menu86Widget,
  KitchenWasteWidget,
  AllergenNoteWidget,
}
