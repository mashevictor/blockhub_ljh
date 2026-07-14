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

/** A+B：编排态可改可测；试运营态锁定 */
export type PlazaWorkMode = 'edit' | 'run'

export interface PlazaRunStep {
  id: string
  label: string
}

export interface PlazaFlowRunSnapshot {
  phase: PlazaRunPhase
  mode: PlazaWorkMode
  steps: PlazaRunStep[]
  stepIndex: number
  currentStep: PlazaRunStep | null
  progressLabel: string
  errorMessage?: string
  /** 就绪/已停止才允许改模块、测接口、>> 命令 */
  canEdit: boolean
  canTestApi: boolean
}

interface Value extends PlazaFlowRunSnapshot {
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  retry: () => void
  reset: () => void
  enterEditMode: () => void
  enterRunMode: () => void
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

export function isPlazaEditablePhase(phase: PlazaRunPhase): boolean {
  return phase === 'idle' || phase === 'stopped'
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
  const [mode, setMode] = useState<PlazaWorkMode>('edit')
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
    setMode('edit')
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
    setMode('run')
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

  /** B：回编排 = 停止并解锁 */
  const enterEditMode = useCallback(() => {
    clearTimer()
    if (phase === 'running' || phase === 'paused') {
      setPhase('stopped')
    } else if (phase === 'completed' || phase === 'error') {
      setPhase('idle')
      setStepIndex(0)
      setErrorMessage(undefined)
    }
    setMode('edit')
  }, [clearTimer, phase])

  /** B：切试运营（不自动 start，由按钮发动） */
  const enterRunMode = useCallback(() => {
    setMode('run')
  }, [])

  /** 仅执行中/暂停锁定；就绪与已停止始终可编排（与「编排|试运营」分段解耦） */
  const canEdit = isPlazaEditablePhase(phase)
  const canTestApi = canEdit

  const currentStep = steps[stepIndex] ?? null
  const progressLabel =
    steps.length > 0 && phase !== 'idle'
      ? `${phaseLabel(phase)} · ${currentStep?.label ?? '—'} · ${Math.min(stepIndex + 1, steps.length)}/${steps.length}`
      : phaseLabel(phase)

  const value = useMemo<Value>(
    () => ({
      phase,
      mode,
      steps,
      stepIndex,
      currentStep,
      progressLabel,
      errorMessage,
      canEdit,
      canTestApi,
      start,
      pause,
      resume,
      stop,
      retry,
      reset,
      enterEditMode,
      enterRunMode,
    }),
    [
      phase,
      mode,
      steps,
      stepIndex,
      currentStep,
      progressLabel,
      errorMessage,
      canEdit,
      canTestApi,
      start,
      pause,
      resume,
      stop,
      retry,
      reset,
      enterEditMode,
      enterRunMode,
    ],
  )

  return <PlazaFlowRunContext.Provider value={value}>{children}</PlazaFlowRunContext.Provider>
}

const EMPTY: Value = {
  phase: 'idle',
  mode: 'edit',
  steps: [],
  stepIndex: 0,
  currentStep: null,
  progressLabel: '就绪',
  canEdit: true,
  canTestApi: true,
  start: () => {},
  pause: () => {},
  resume: () => {},
  stop: () => {},
  retry: () => {},
  reset: () => {},
  enterEditMode: () => {},
  enterRunMode: () => {},
}

export function usePlazaFlowRun(): Value {
  return useContext(PlazaFlowRunContext) ?? EMPTY
}
