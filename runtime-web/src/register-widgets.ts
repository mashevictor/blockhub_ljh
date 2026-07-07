import { registerWidget } from '@blockhub/web-core'
import { ChatWidget } from '@blockhub/web-capability-chat'
import { FormWidget, ApprovalInboxWidget, ListWidget } from '@blockhub/web-capability-approval'
import { ShanghaiVoiceWidget } from '@blockhub/web-capability-voice'
import { KBUploadWidget } from '@blockhub/web-capability-kb'
import { DashboardWidget } from '@blockhub/web-capability-dashboard'

export function bootWidgetRegistry(): void {
  registerWidget('ChatWidget', ChatWidget)
  registerWidget('FormWidget', FormWidget)
  registerWidget('ApprovalInboxWidget', ApprovalInboxWidget)
  registerWidget('ListWidget', ListWidget)
  registerWidget('ShanghaiVoiceWidget', ShanghaiVoiceWidget)
  registerWidget('KBUploadWidget', KBUploadWidget)
  registerWidget('DashboardWidget', DashboardWidget)
}
