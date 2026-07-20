import { registerWidget } from '@blockhub/web-core'
import { KillPipelineWidget } from './KillPipelineWidget'

registerWidget('KillPipelineWidget', KillPipelineWidget as Parameters<typeof registerWidget>[1])
export { KillPipelineWidget }
