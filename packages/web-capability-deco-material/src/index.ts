import { registerWidget } from '@blockhub/web-core'
import { DecoMaterialWidget } from './DecoMaterialWidget'

registerWidget('DecoMaterialWidget', DecoMaterialWidget as Parameters<typeof registerWidget>[1])
export { DecoMaterialWidget }
