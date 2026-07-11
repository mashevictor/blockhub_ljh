import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface Value {
  draft: string
  setDraft: (v: string) => void
}

const PromptDraftContext = createContext<Value | null>(null)

export function PromptDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState('')
  const value = useMemo(() => ({ draft, setDraft }), [draft])
  return <PromptDraftContext.Provider value={value}>{children}</PromptDraftContext.Provider>
}

export function usePromptDraft() {
  const ctx = useContext(PromptDraftContext)
  if (!ctx) {
    return { draft: '', setDraft: () => {} }
  }
  return ctx
}
