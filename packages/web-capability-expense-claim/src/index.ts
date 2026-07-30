import { registerWidget } from '@blockhub/web-core'
import './locales'
import { ExpenseClaimWidget } from './ExpenseClaimWidget'

registerWidget('ExpenseClaimWidget', ExpenseClaimWidget as Parameters<typeof registerWidget>[1])
export { ExpenseClaimWidget }
