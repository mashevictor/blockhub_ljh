import { registerWidget } from '@blockhub/web-core'
import { AssetManageWidget } from './AssetManageWidget'

registerWidget('AssetManageWidget', AssetManageWidget as Parameters<typeof registerWidget>[1])
export { AssetManageWidget }
