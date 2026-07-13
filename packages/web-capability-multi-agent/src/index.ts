import { registerWidget } from '@blockhub/web-core'

import { default as MultiAgentWidget } from './MultiAgentWidget'

registerWidget('MultiAgentWidget', MultiAgentWidget as Parameters<typeof registerWidget>[1])

export { MultiAgentWidget }
