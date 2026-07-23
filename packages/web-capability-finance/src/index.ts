import { registerWidget } from '@blockhub/web-core'
import {
  CreditApprovalWidget,
  DueDiligenceWidget,
  FinanceAmlWidget,
  FinanceKycWidget,
  InsuranceCaseWidget,
  RegulatoryReportWidget,
} from './FinanceOpsWidgets'

registerWidget('FinanceKycWidget', FinanceKycWidget as Parameters<typeof registerWidget>[1])
registerWidget('FinanceAmlWidget', FinanceAmlWidget as Parameters<typeof registerWidget>[1])
registerWidget('CreditApprovalWidget', CreditApprovalWidget as Parameters<typeof registerWidget>[1])
registerWidget('DueDiligenceWidget', DueDiligenceWidget as Parameters<typeof registerWidget>[1])
registerWidget('RegulatoryReportWidget', RegulatoryReportWidget as Parameters<typeof registerWidget>[1])
registerWidget('InsuranceCaseWidget', InsuranceCaseWidget as Parameters<typeof registerWidget>[1])

export {
  FinanceKycWidget,
  FinanceAmlWidget,
  CreditApprovalWidget,
  DueDiligenceWidget,
  RegulatoryReportWidget,
  InsuranceCaseWidget,
}
