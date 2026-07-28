import { registerWidget } from '@blockhub/web-core'
import { SitePatrolWidget } from './SitePatrolWidget'

import './locales'
registerWidget('SitePatrolWidget', SitePatrolWidget as Parameters<typeof registerWidget>[1])
export { SitePatrolWidget }
