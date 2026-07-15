import { registerWidget } from '@blockhub/web-core'
import { OpsKpiWidget } from './OpsKpiWidget'

registerWidget('OpsKpiWidget', OpsKpiWidget as Parameters<typeof registerWidget>[1])
export { OpsKpiWidget }
