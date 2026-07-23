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

/** 流程预览动画相位（不写库、不锁改页——广场恒只读） */
export type PlazaRunPhase =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error'
  | 'stopped'

/** 概览（只读）| 流程预览（轻动画） */
export type PlazaWorkMode = 'overview' | 'preview'

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
  /** 广场恒 false：改模块请进 Runtime 对话改页 */
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
  enterOverviewMode: () => void
  enterPreviewMode: () => void
  /** @deprecated 用 enterOverviewMode */
  enterEditMode: () => void
  /** @deprecated 用 enterPreviewMode */
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
      return '概览'
    case 'running':
      return '流程预览中'
    case 'paused':
      return '预览已暂停'
    case 'completed':
      return '预览完成'
    case 'error':
      return '预览失败'
    case 'stopped':
      return '已停止预览'
  }
}

export function isPlazaEditablePhase(_phase: PlazaRunPhase): boolean {
  // 广场侧永不开放编排写操作
  return false
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
  const [mode, setMode] = useState<PlazaWorkMode>('overview')
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
    setMode('overview')
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
    setMode('preview')
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
    setMode('overview')
  }, [clearTimer])

  const retry = useCallback(() => {
    start()
  }, [start])

  const enterOverviewMode = useCallback(() => {
    clearTimer()
    setPhase('idle')
    setStepIndex(0)
    setErrorMessage(undefined)
    setMode('overview')
  }, [clearTimer])

  const enterPreviewMode = useCallback(() => {
    setMode('preview')
  }, [])

  const canEdit = false
  const canTestApi = false

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
      enterOverviewMode,
      enterPreviewMode,
      enterEditMode: enterOverviewMode,
      enterRunMode: enterPreviewMode,
    }),
    [
      phase,
      mode,
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
      enterOverviewMode,
      enterPreviewMode,
    ],
  )

  return <PlazaFlowRunContext.Provider value={value}>{children}</PlazaFlowRunContext.Provider>
}

const EMPTY: Value = {
  phase: 'idle',
  mode: 'overview',
  steps: [],
  stepIndex: 0,
  currentStep: null,
  progressLabel: '概览',
  canEdit: false,
  canTestApi: false,
  start: () => {},
  pause: () => {},
  resume: () => {},
  stop: () => {},
  retry: () => {},
  reset: () => {},
  enterOverviewMode: () => {},
  enterPreviewMode: () => {},
  enterEditMode: () => {},
  enterRunMode: () => {},
}

export function usePlazaFlowRun(): Value {
  return useContext(PlazaFlowRunContext) ?? EMPTY
}
