import { registerWidget } from '@blockhub/web-core'
import { GovServiceWidget } from './GovServiceWidget'

import './locales'
registerWidget('GovServiceWidget', GovServiceWidget as Parameters<typeof registerWidget>[1])
export { GovServiceWidget }
