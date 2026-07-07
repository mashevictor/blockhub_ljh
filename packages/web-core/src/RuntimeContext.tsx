import { createContext, useContext } from 'react'
import type { RuntimeContextValue } from './types'

export const RuntimeContext = createContext<RuntimeContextValue | null>(null)

export function useRuntime(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext)
  if (!ctx) throw new Error('useRuntime must be used within RuntimeContext')
  return ctx
}
