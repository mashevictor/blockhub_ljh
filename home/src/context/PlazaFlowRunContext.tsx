import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { FLOW_EGRESS_ID, FLOW_INGRESS_ID, loadModuleFlow } from '../lib/plazaModuleFlow'

/** Agent 编排试运行状态 */
export type PlazaRunPhase =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error'
  | 'stopped'

export interface PlazaRunStep {
  id: string
  label: string
}

export interface PlazaFlowRunSnapshot {
  phase: PlazaRunPhase
  steps: PlazaRunStep[]
  stepIndex: number
  currentStep: PlazaRunStep | null
  progressLabel: string
  errorMessage?: string
}

interface Value extends PlazaFlowRunSnapshot {
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  retry: () => void
  reset: () => void
}

const STEP_MS = 1400

const PlazaFlowRunContext = createContext<Value | null>(null)

function buildSteps(appKey: string, moduleLabels: string[]): PlazaRunStep[] {
  const flow = loadModuleFlow(appKey, moduleLabels)
  return [
    { id: FLOW_INGRESS_ID, label: '用户意图' },
    ...flow.steps.map((s) => ({ id: s.id, label: s.label })),
    { id: FLOW_EGRESS_ID, label: '触达输出' },
  ]
}

function phaseLabel(phase: PlazaRunPhase): string {
  switch (phase) {
    case 'idle':
      return '就绪'
    case 'running':
      return '执行中'
    case 'paused':
      return '已暂停'
    case 'completed':
      return '已完成'
    case 'error':
      return '失败'
    case 'stopped':
      return '已停止'
  }
}

export function PlazaFlowRunProvider({
  appKey,
  moduleLabels,
  children,
}: {
  appKey: string | null
  moduleLabels: string[]
  children: ReactNode
}) {
  const [phase, setPhase] = useState<PlazaRunPhase>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const timerRef = useRef<number | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const steps = useMemo(
    () => (appKey ? buildSteps(appKey, moduleLabels) : []),
    [appKey, moduleLabels.join('|')],
  )

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setPhase('idle')
    setStepIndex(0)
    setErrorMessage(undefined)
  }, [clearTimer])

  useEffect(() => {
    reset()
  }, [appKey, moduleLabels.join('|'), reset])

  useEffect(() => () => clearTimer(), [clearTimer])

  const scheduleNext = useCallback(
    (fromIndex: number) => {
      clearTimer()
      if (phaseRef.current !== 'running') return
      const next = fromIndex + 1
      if (next >= steps.length) {
        setPhase('completed')
        setStepIndex(Math.max(0, steps.length - 1))
        return
      }
      timerRef.current = window.setTimeout(() => {
        if (phaseRef.current !== 'running') return
        setStepIndex(next)
        scheduleNext(next)
      }, STEP_MS)
    },
    [clearTimer, steps.length],
  )

  const start = useCallback(() => {
    if (!steps.length) return
    clearTimer()
    setErrorMessage(undefined)
    setStepIndex(0)
    setPhase('running')
    scheduleNext(0)
  }, [clearTimer, scheduleNext, steps.length])

  const pause = useCallback(() => {
    if (phase !== 'running') return
    clearTimer()
    setPhase('paused')
  }, [clearTimer, phase])

  const resume = useCallback(() => {
    if (phase !== 'paused') return
    setPhase('running')
    scheduleNext(stepIndex)
  }, [phase, scheduleNext, stepIndex])

  const stop = useCallback(() => {
    clearTimer()
    setPhase('stopped')
  }, [clearTimer])

  const retry = useCallback(() => {
    start()
  }, [start])

  const currentStep = steps[stepIndex] ?? null
  const progressLabel =
    steps.length > 0 && phase !== 'idle'
      ? `${phaseLabel(phase)} · ${currentStep?.label ?? '—'} · ${Math.min(stepIndex + 1, steps.length)}/${steps.length}`
      : phaseLabel(phase)

  const value = useMemo<Value>(
    () => ({
      phase,
      steps,
      stepIndex,
      currentStep,
      progressLabel,
      errorMessage,
      start,
      pause,
      resume,
      stop,
      retry,
      reset,
    }),
    [
      phase,
      steps,
      stepIndex,
      currentStep,
      progressLabel,
      errorMessage,
      start,
      pause,
      resume,
      stop,
      retry,
      reset,
    ],
  )

  return <PlazaFlowRunContext.Provider value={value}>{children}</PlazaFlowRunContext.Provider>
}

export function usePlazaFlowRun(): Value {
  const ctx = useContext(PlazaFlowRunContext)
  if (!ctx) {
    return {
      phase: 'idle',
      steps: [],
      stepIndex: 0,
      currentStep: null,
      progressLabel: '就绪',
      start: () => {},
      pause: () => {},
      resume: () => {},
      stop: () => {},
      retry: () => {},
      reset: () => {},
    }
  }
  return ctx
}
