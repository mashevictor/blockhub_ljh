import { registerWidget } from '@blockhub/web-core'

import { default as CreationWizard } from './CreationWizard'

registerWidget('CreationWizard', CreationWizard as Parameters<typeof registerWidget>[1])

export { CreationWizard }
