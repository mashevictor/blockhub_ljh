import { registerWidget } from '@blockhub/web-core'
import { CampaignOpsWidget } from './CampaignOpsWidget'

registerWidget('CampaignOpsWidget', CampaignOpsWidget as Parameters<typeof registerWidget>[1])
export { CampaignOpsWidget }
