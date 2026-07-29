/** Resolve agent page-context copy from home.json (`home.agent.ctx.*`). */

import type { AgentContextCopy, AgentContextKey } from '../data/agentContext'
import { AGENT_CONTEXTS } from '../data/agentContext'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

function field(
  t: TranslateFn,
  ctx: AgentContextKey,
  suffix: 'chev' | 'placeholder' | 'collapsed' | 'ghost',
  fallback: string,
): string {
  const key = `home.agent.ctx.${ctx}.${suffix}`
  const text = t(key)
  return text === key ? fallback : text
}

/** Localized copy for the current agent page context. */
export function localizeAgentContext(t: TranslateFn, ctx: AgentContextKey): AgentContextCopy {
  const fb = AGENT_CONTEXTS[ctx]
  const collapsedFb = fb.placeholderCollapsed ?? fb.placeholder
  const collapsed = field(t, ctx, 'collapsed', collapsedFb)
  return {
    chevLabel: field(t, ctx, 'chev', fb.chevLabel),
    placeholder: field(t, ctx, 'placeholder', fb.placeholder),
    placeholderCollapsed: collapsed,
    ghost: field(t, ctx, 'ghost', fb.ghost),
  }
}
