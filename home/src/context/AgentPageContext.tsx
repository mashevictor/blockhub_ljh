import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AgentContextKey } from '../data/agentContext'

interface Value {
  contextKey: AgentContextKey
  setContextKey: (key: AgentContextKey) => void
}

const AgentPageContext = createContext<Value | null>(null)

export function AgentPageProvider({
  initial = 'landing_hero',
  children,
}: {
  initial?: AgentContextKey
  children: ReactNode
}) {
  const [contextKey, setContextKey] = useState<AgentContextKey>(initial)
  const value = useMemo(() => ({ contextKey, setContextKey }), [contextKey])
  return <AgentPageContext.Provider value={value}>{children}</AgentPageContext.Provider>
}

export function useAgentPageContext() {
  const ctx = useContext(AgentPageContext)
  if (!ctx) {
    return {
      contextKey: 'create_prompt' as AgentContextKey,
      setContextKey: () => {},
    }
  }
  return ctx
}
