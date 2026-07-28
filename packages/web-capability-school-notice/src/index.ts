import { registerWidget } from '@blockhub/web-core'
import { SchoolNoticeWidget } from './SchoolNoticeWidget'

import './locales'
registerWidget('SchoolNoticeWidget', SchoolNoticeWidget as Parameters<typeof registerWidget>[1])
export { SchoolNoticeWidget }
