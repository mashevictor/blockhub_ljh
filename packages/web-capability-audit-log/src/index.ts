import { registerWidget } from '@blockhub/web-core'

import { default as AuditWidget } from './AuditWidget'

registerWidget('AuditWidget', AuditWidget as Parameters<typeof registerWidget>[1])

export { AuditWidget }
