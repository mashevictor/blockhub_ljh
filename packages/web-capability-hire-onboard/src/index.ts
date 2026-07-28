import { registerWidget } from '@blockhub/web-core'
import { HireOnboardWidget } from './HireOnboardWidget'

import './locales'
registerWidget('HireOnboardWidget', HireOnboardWidget as Parameters<typeof registerWidget>[1])
export { HireOnboardWidget }
