import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export interface PlazaFocusTarget {
  appKey: string
  appName: string
  webUrl: string
  moduleCount: number
  plazaLabel?: string
  isCreator: boolean
  source: 'feed' | 'my'
  inOrchestration?: boolean
}

type OrchestrationHandler = (appKey: string) => void

interface Value {
  focus: PlazaFocusTarget | null
  setFocus: (target: PlazaFocusTarget | null) => void
  registerOrchestrationHandler: (handler: OrchestrationHandler | null) => void
  requestOrchestration: (appKey: string) => void
}

const PlazaFocusContext = createContext<Value | null>(null)

export function PlazaFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<PlazaFocusTarget | null>(null)
  const orchHandlerRef = useRef<OrchestrationHandler | null>(null)

  const registerOrchestrationHandler = useCallback((handler: OrchestrationHandler | null) => {
    orchHandlerRef.current = handler
  }, [])

  const requestOrchestration = useCallback((appKey: string) => {
    orchHandlerRef.current?.(appKey)
  }, [])

  const value = useMemo(
    () => ({ focus, setFocus, registerOrchestrationHandler, requestOrchestration }),
    [focus, registerOrchestrationHandler, requestOrchestration],
  )

  return <PlazaFocusContext.Provider value={value}>{children}</PlazaFocusContext.Provider>
}

export function usePlazaFocus() {
  const ctx = useContext(PlazaFocusContext)
  if (!ctx) {
    return {
      focus: null,
      setFocus: () => {},
      registerOrchestrationHandler: () => {},
      requestOrchestration: () => {},
    }
  }
  return ctx
}
