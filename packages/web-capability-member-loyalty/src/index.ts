import { registerWidget } from '@blockhub/web-core'
import { MemberLoyaltyWidget } from './MemberLoyaltyWidget'

registerWidget('MemberLoyaltyWidget', MemberLoyaltyWidget as Parameters<typeof registerWidget>[1])
export { MemberLoyaltyWidget }
