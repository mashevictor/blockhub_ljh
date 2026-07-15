import { registerWidget } from '@blockhub/web-core'
import { GovServiceWidget } from './GovServiceWidget'

registerWidget('GovServiceWidget', GovServiceWidget as Parameters<typeof registerWidget>[1])
export { GovServiceWidget }
