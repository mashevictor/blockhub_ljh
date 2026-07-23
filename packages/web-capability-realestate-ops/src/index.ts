import { registerWidget } from '@blockhub/web-core'
import {
  BrokerCommissionWidget,
  DecoAcceptanceWidget,
  LeaseRenewalWidget,
  ListingPublishWidget,
  OwnerComplaintWidget,
  PropertyFeeWidget,
  ReContractWidget,
  RentCollectionWidget,
  SalesFollowupWidget,
  ViewingFeedbackWidget,
} from './RealestateOpsWidgets'

registerWidget('ListingPublishWidget', ListingPublishWidget as Parameters<typeof registerWidget>[1])
registerWidget('RentCollectionWidget', RentCollectionWidget as Parameters<typeof registerWidget>[1])
registerWidget('LeaseRenewalWidget', LeaseRenewalWidget as Parameters<typeof registerWidget>[1])
registerWidget('OwnerComplaintWidget', OwnerComplaintWidget as Parameters<typeof registerWidget>[1])
registerWidget('DecoAcceptanceWidget', DecoAcceptanceWidget as Parameters<typeof registerWidget>[1])
registerWidget('SalesFollowupWidget', SalesFollowupWidget as Parameters<typeof registerWidget>[1])
registerWidget('ReContractWidget', ReContractWidget as Parameters<typeof registerWidget>[1])
registerWidget('ViewingFeedbackWidget', ViewingFeedbackWidget as Parameters<typeof registerWidget>[1])
registerWidget('PropertyFeeWidget', PropertyFeeWidget as Parameters<typeof registerWidget>[1])
registerWidget('BrokerCommissionWidget', BrokerCommissionWidget as Parameters<typeof registerWidget>[1])

export {
  ListingPublishWidget,
  RentCollectionWidget,
  LeaseRenewalWidget,
  OwnerComplaintWidget,
  DecoAcceptanceWidget,
  SalesFollowupWidget,
  ReContractWidget,
  ViewingFeedbackWidget,
  PropertyFeeWidget,
  BrokerCommissionWidget,
}
