import { registerWidget } from '@blockhub/web-core'
import {
  EnergyCarbonWidget,
  MaintenancePlanWidget,
  MaterialIssueWidget,
  MfgOeeWidget,
  ShiftAttendanceWidget,
  TrainingRecordWidget,
} from './MfgOpsWidgets'

registerWidget('MfgOeeWidget', MfgOeeWidget as Parameters<typeof registerWidget>[1])
registerWidget('MaterialIssueWidget', MaterialIssueWidget as Parameters<typeof registerWidget>[1])
registerWidget('MaintenancePlanWidget', MaintenancePlanWidget as Parameters<typeof registerWidget>[1])
registerWidget('ShiftAttendanceWidget', ShiftAttendanceWidget as Parameters<typeof registerWidget>[1])
registerWidget('EnergyCarbonWidget', EnergyCarbonWidget as Parameters<typeof registerWidget>[1])
registerWidget('TrainingRecordWidget', TrainingRecordWidget as Parameters<typeof registerWidget>[1])

export {
  MfgOeeWidget,
  MaterialIssueWidget,
  MaintenancePlanWidget,
  ShiftAttendanceWidget,
  EnergyCarbonWidget,
  TrainingRecordWidget,
}
