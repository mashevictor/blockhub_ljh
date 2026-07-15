import { registerWidget } from '@blockhub/web-core'
import { HireOnboardWidget } from './HireOnboardWidget'

registerWidget('HireOnboardWidget', HireOnboardWidget as Parameters<typeof registerWidget>[1])
export { HireOnboardWidget }
