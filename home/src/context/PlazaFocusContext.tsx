import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export interface PlazaFocusTarget {
  appKey: string
  appName: string
  webUrl: string
  moduleCount: number
  moduleLabels?: string[]
  plazaLabel?: string
  isCreator: boolean
  source: 'feed' | 'my'
  inOrchestration?: boolean
}

type OrchestrationHandler = (appKey: string) => void
type CommandRunner = (cmd: string) => void

interface Value {
  focus: PlazaFocusTarget | null
  setFocus: (target: PlazaFocusTarget | null) => void
  registerOrchestrationHandler: (handler: OrchestrationHandler | null) => void
  requestOrchestration: (appKey: string) => void
  /** 递增以请求底部工作台展开（列表状态按钮等） */
  dockExpandSignal: number
  requestDockExpand: () => void
  /** 折叠条指令 → 展开后的业务输入执行器 */
  registerCommandRunner: (runner: CommandRunner | null) => void
  runCommand: (cmd: string) => boolean
}

const PlazaFocusContext = createContext<Value | null>(null)

export function PlazaFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<PlazaFocusTarget | null>(null)
  const [dockExpandSignal, setDockExpandSignal] = useState(0)
  const orchHandlerRef = useRef<OrchestrationHandler | null>(null)
  const commandRunnerRef = useRef<CommandRunner | null>(null)
  const pendingCommandRef = useRef<string | null>(null)

  const registerOrchestrationHandler = useCallback((handler: OrchestrationHandler | null) => {
    orchHandlerRef.current = handler
  }, [])

  const requestOrchestration = useCallback((appKey: string) => {
    orchHandlerRef.current?.(appKey)
  }, [])

  const requestDockExpand = useCallback(() => {
    setDockExpandSignal((n) => n + 1)
  }, [])

  const registerCommandRunner = useCallback((runner: CommandRunner | null) => {
    commandRunnerRef.current = runner
    const pending = pendingCommandRef.current
    if (runner && pending) {
      pendingCommandRef.current = null
      runner(pending)
    }
  }, [])

  const runCommand = useCallback((cmd: string) => {
    const text = cmd.trim()
    if (!text) return false
    if (commandRunnerRef.current) {
      commandRunnerRef.current(text)
      return true
    }
    pendingCommandRef.current = text
    setDockExpandSignal((n) => n + 1)
    return true
  }, [])

  const value = useMemo(
    () => ({
      focus,
      setFocus,
      registerOrchestrationHandler,
      requestOrchestration,
      dockExpandSignal,
      requestDockExpand,
      registerCommandRunner,
      runCommand,
    }),
    [
      focus,
      registerOrchestrationHandler,
      requestOrchestration,
      dockExpandSignal,
      requestDockExpand,
      registerCommandRunner,
      runCommand,
    ],
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
      dockExpandSignal: 0,
      requestDockExpand: () => {},
      registerCommandRunner: () => {},
      runCommand: () => false,
    }
  }
  return ctx
}
