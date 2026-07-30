import { registerWidget } from '@blockhub/web-core'
import { AssetManageWidget } from './AssetManageWidget'

import './locales'
registerWidget('AssetManageWidget', AssetManageWidget as Parameters<typeof registerWidget>[1])
export { AssetManageWidget }
