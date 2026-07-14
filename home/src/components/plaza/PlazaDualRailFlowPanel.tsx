import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'
import {
  getModuleCapability,
  modulesAvailableToAdd,
  type ModuleCapability,
} from '../../data/moduleCatalog'
import {
  apiNodeMap,
  buildFallbackFlowApis,
  dialFlowModuleApis,
  loadCachedFlowApis,
  type FlowApiEndpoint,
  type FlowApiNode,
} from '../../lib/flowModuleApis'
import type { AppModuleFlow } from '../../lib/plazaModuleFlow'
import {
  FLOW_EGRESS_ID,
  FLOW_INGRESS_ID,
  buildFlowApiNodeList,
  flowStepsFingerprint,
  insertFlowStepAfter,
  loadModuleFlow,
  removeFlowStep,
  reorderFlowSteps,
  updateFlowStep,
} from '../../lib/plazaModuleFlow'
import FlowOrchestrationDock from './FlowOrchestrationDock'
import PlazaWorkModeSwitch from './PlazaWorkModeSwitch'
import PlazaRunControls from './PlazaRunControls'

const DATA_PAGE = 5

interface Props {
  appKey: string
  appName: string
  moduleLabels: string[]
  isCreator: boolean
  /** 页内嵌入（广场 feed / 全屏）时显示顶栏模式切换 */
  embedded?: boolean
  /** 底部工作台从折叠展开时递增，左右轨重置为前 5 项 */
  pageResetSignal?: number
}

function FuncNode({
  id,
  label,
  sub,
  active,
  running,
  draggable,
  isDragging,
  isDragOver,
  readOnly,
  onSelect,
  onGripDown,
  stepIndex,
}: {
  id: string
  label: string
  sub?: string
  active: boolean
  running?: boolean
  draggable?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  readOnly?: boolean
  onSelect: () => void
  onGripDown?: (e: React.PointerEvent<HTMLButtonElement>) => void
  stepIndex?: number
}) {
  return (
    <div
      className={`plaza-dual-rail-node-wrap${isDragging ? ' dragging' : ''}${isDragOver ? ' drag-over' : ''}`}
      data-step-index={stepIndex}
      data-node-id={id}
    >
      {draggable && (
        <button
          type="button"
          className="plaza-dual-rail-grip"
          aria-label={`拖动 ${label}`}
          onPointerDown={(e) => {
            e.stopPropagation()
            onGripDown?.(e)
          }}
        >
          ⠿
        </button>
      )}
      <button
        type="button"
        className={`plaza-dual-rail-node func${active ? ' active' : ''}${running ? ' running' : ''}${draggable ? ' draggable' : ''}`}
        onClick={onSelect}
        disabled={readOnly && false}
        aria-pressed={active}
      >
        <span className="plaza-dual-rail-node-label">{label}</span>
        {sub && <span className="plaza-dual-rail-node-sub">{sub}</span>}
      </button>
    </div>
  )
}

function DataNodePair({
  nodeId,
  inputApi,
  outputApi,
  active,
  activeSide,
  running,
  onSelect,
}: {
  nodeId: string
  inputApi?: FlowApiEndpoint
  outputApi?: FlowApiEndpoint
  active: boolean
  activeSide: 'input' | 'output' | null
  running?: boolean
  onSelect: (side: 'input' | 'output') => void
}) {
  return (
    <div
      className={`plaza-dual-rail-data-pair${active ? ' active' : ''}${running ? ' running' : ''}`}
      data-node-id={nodeId}
    >
      <button
        type="button"
        className={`plaza-dual-rail-node data io-input${active && activeSide === 'input' ? ' side-active' : ''}`}
        onClick={() => onSelect('input')}
        aria-pressed={active && activeSide === 'input'}
      >
        <span className="plaza-dual-rail-io-tag input">IN</span>
        <span className={`plaza-dual-rail-method method-${(inputApi?.method ?? '—').toLowerCase()}`}>
          {inputApi?.method ?? '—'}
        </span>
        <span className="plaza-dual-rail-path">{inputApi?.path ?? '—'}</span>
      </button>
      <button
        type="button"
        className={`plaza-dual-rail-node data io-output${active && activeSide === 'output' ? ' side-active' : ''}`}
        onClick={() => onSelect('output')}
        aria-pressed={active && activeSide === 'output'}
      >
        <span className="plaza-dual-rail-io-tag output">OUT</span>
        <span className={`plaza-dual-rail-method method-${(outputApi?.method ?? '—').toLowerCase()}`}>
          {outputApi?.method ?? '—'}
        </span>
        <span className="plaza-dual-rail-path">{outputApi?.path ?? '—'}</span>
      </button>
    </div>
  )
}

export default function PlazaDualRailFlowPanel({
  appKey,
  appName,
  moduleLabels,
  isCreator,
  embedded = false,
  pageResetSignal = 0,
}: Props) {
  const [flow, setFlow] = useState<AppModuleFlow>(() => loadModuleFlow(appKey, moduleLabels))
  const run = usePlazaFlowRun()
  const canMutate = isCreator && run.canEdit
  const [activeNodeId, setActiveNodeId] = useState<string | null>(FLOW_INGRESS_ID)
  const [activeApiSide, setActiveApiSide] = useState<'input' | 'output' | null>('input')
  const [pickerAfterStepId, setPickerAfterStepId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState('')
  const [dataVisible, setDataVisible] = useState(DATA_PAGE)
  const [funcVisible, setFuncVisible] = useState(DATA_PAGE)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const overIndexRef = useRef<number | null>(null)
  const dragPointerIdRef = useRef<number | null>(null)
  const [apiNodes, setApiNodes] = useState<Map<string, FlowApiNode>>(() => {
    const fp = flowStepsFingerprint(loadModuleFlow(appKey, moduleLabels).steps)
    const cached = loadCachedFlowApis(appKey, fp)
    return apiNodeMap(cached ?? buildFallbackFlowApis(appKey, loadModuleFlow(appKey, moduleLabels).steps))
  })

  overIndexRef.current = overIndex

  useEffect(() => {
    if (run.phase === 'running' || run.phase === 'paused') {
      if (run.currentStep?.id) setActiveNodeId(run.currentStep.id)
    }
  }, [run.phase, run.currentStep?.id, run.stepIndex])

  const runningNodeId =
    run.phase === 'running' || run.phase === 'paused' ? run.currentStep?.id ?? null : null

  useEffect(() => {
    const loaded = loadModuleFlow(appKey, moduleLabels)
    setFlow(loaded)
    setActiveNodeId(FLOW_INGRESS_ID)
    setActiveApiSide('input')
    setEditingId(null)
    setPickerAfterStepId(null)
    setAnalysis('')
    setDataVisible(DATA_PAGE)
    setFuncVisible(DATA_PAGE)
  }, [appKey, moduleLabels.join('|')])

  useEffect(() => {
    if (!pageResetSignal) return
    setDataVisible(DATA_PAGE)
    setFuncVisible(DATA_PAGE)
  }, [pageResetSignal])

  useEffect(() => {
    const fp = flowStepsFingerprint(flow.steps)
    const cached = loadCachedFlowApis(appKey, fp)
    if (cached) {
      setApiNodes(apiNodeMap(cached))
      return
    }
    const instant = buildFallbackFlowApis(appKey, flow.steps)
    setApiNodes(apiNodeMap(instant))
    void dialFlowModuleApis({
      appKey,
      appName,
      steps: flow.steps,
      onUpgrade: (res) => setApiNodes(apiNodeMap(res)),
    })
  }, [appKey, appName, flow.steps])

  const activeStep = flow.steps.find((s) => s.id === activeNodeId) ?? null
  const availableModules = useMemo(
    () => modulesAvailableToAdd(flow.steps.map((s) => s.label)),
    [flow.steps],
  )
  const flowLabels = useMemo(() => flow.steps.map((s) => s.label), [flow.steps])

  const finishDrag = useCallback((from: number, to: number) => {
    if (!isCreator || run.phase === 'running' || run.phase === 'paused') {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    if (from !== to && from >= 0 && to >= 0) {
      setFlow((prev) => reorderFlowSteps(prev, from, to))
    }
    setDragIndex(null)
    setOverIndex(null)
  }, [isCreator, run.phase])

  useEffect(() => {
    if (dragIndex === null) return
    const onMove = (e: PointerEvent) => {
      if (dragPointerIdRef.current !== null && e.pointerId !== dragPointerIdRef.current) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const wrap = el?.closest('[data-step-index]')
      if (wrap) {
        const to = Number.parseInt(wrap.getAttribute('data-step-index') ?? '', 10)
        if (!Number.isNaN(to)) setOverIndex(to)
      }
    }
    const onUp = (e: PointerEvent) => {
      if (dragPointerIdRef.current !== null && e.pointerId !== dragPointerIdRef.current) return
      finishDrag(dragIndex, overIndexRef.current ?? dragIndex)
      dragPointerIdRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragIndex, finishDrag])

  const dockRef = useRef<HTMLDivElement>(null)

  const funcChain = useMemo(() => {
    return [
      { kind: 'ingress' as const, id: FLOW_INGRESS_ID, label: '📥 用户意图', sub: '业务请求进入', stepIndex: -1 },
      ...flow.steps.map((s, i) => ({
        kind: 'step' as const,
        id: s.id,
        label: s.label,
        sub: getModuleCapability(s.label)?.desc ?? s.note,
        stepIndex: i,
      })),
      { kind: 'egress' as const, id: FLOW_EGRESS_ID, label: '📤 网页 + App', sub: '触达输出', stepIndex: -1 },
    ]
  }, [flow.steps])

  const visibleFuncNodes = funcChain.slice(0, funcVisible)
  const funcRemaining = Math.max(0, funcChain.length - funcVisible)

  const selectNode = (nodeId: string, side: 'input' | 'output' = 'input') => {
    setActiveNodeId(nodeId)
    setActiveApiSide(side)
    setEditingId(null)
    setPickerAfterStepId(null)
    const chainIdx = funcChain.findIndex((n) => n.id === nodeId)
    if (chainIdx >= 0) {
      const need = Math.min(funcChain.length, chainIdx + 1)
      setFuncVisible((n) => Math.max(n, need))
      setDataVisible((n) => Math.max(n, need))
    }
    requestAnimationFrame(() => {
      dockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const openNodeByLabel = (label: string, side: 'input' | 'output' = 'input') => {
    const norm = label.replace(/^📥\s*|^📤\s*/, '').trim()
    if (/用户意图|业务输入|业务请求/.test(norm)) {
      selectNode(FLOW_INGRESS_ID, side === 'output' ? 'output' : 'input')
      return
    }
    if (/触达输出|网页\s*\+\s*App|网页/.test(norm)) {
      selectNode(FLOW_EGRESS_ID, 'output')
      return
    }
    const hit =
      flow.steps.find((s) => s.label === norm)
      ?? flow.steps.find((s) => s.label.includes(norm) || norm.includes(s.label))
    if (hit) selectNode(hit.id, side)
  }

  const nodeLabels = useMemo(
    () => ['用户意图', ...flow.steps.map((s) => s.label), '触达输出'],
    [flow.steps],
  )

  const handleAddFromCatalog = (mod: ModuleCapability, afterId: string | null) => {
    if (!canMutate) return
    const next = insertFlowStepAfter(flow, afterId, mod.label, mod.flowHint)
    setFlow(next)
    const idx =
      afterId === FLOW_INGRESS_ID
        ? 0
        : afterId
          ? next.steps.findIndex((s) => s.id === afterId)
          : -1
    const newId = idx >= 0 ? next.steps[idx + 1]?.id ?? next.steps[idx]?.id : next.steps[next.steps.length - 1]?.id
    if (newId) selectNode(newId, 'input')
    setPickerAfterStepId(null)
  }

  const dataRows = useMemo(() => {
    return buildFlowApiNodeList(flow.steps).map((n) => {
      const api = apiNodes.get(n.node_id)
      return {
        id: n.node_id,
        input: api?.input_api,
        output: api?.output_api,
      }
    })
  }, [flow.steps, apiNodes])

  const visibleDataRows = dataRows.slice(0, dataVisible)
  const dataRemaining = Math.max(0, dataRows.length - dataVisible)

  const activeApiNode = activeNodeId ? apiNodes.get(activeNodeId) ?? null : null

  const startEdit = () => {
    if (!activeStep || !canMutate) return
    setEditingId(activeStep.id)
    setEditNote(activeStep.note)
    setPickerAfterStepId(null)
  }

  const saveEdit = () => {
    if (!editingId || !canMutate) return
    setFlow(updateFlowStep(flow, editingId, { note: editNote }))
    setEditingId(null)
  }

  return (
    <div
      className={`plaza-dual-rail-panel${embedded ? ' is-embedded' : ''}${canMutate ? '' : ' is-run-locked'}`}
      aria-label={`${appName} 双轨编排`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {embedded && (
        <div className="plaza-dual-rail-embed-bar">
          <PlazaWorkModeSwitch />
          <PlazaRunControls compact />
        </div>
      )}

      {!run.canEdit && (
        <p className="plaza-dual-rail-lock-banner" role="status">
          {run.mode === 'run'
            ? '试运营模式 · 修改与测试已锁定 · 请「停止」或切回「编排」'
            : '当前不可编辑 · 请重置到就绪或停止后再改'}
        </p>
      )}

      <div className="plaza-dual-rail-grid">
        <div className="plaza-dual-rail-col">
          <div className="plaza-dual-rail-col-head">
            <span className="plaza-mflow-chev">&gt;&gt;</span> 功能编排
            <span className="plaza-dual-rail-col-hint">
              {run.phase === 'running'
                ? '试运营中'
                : run.phase === 'paused'
                  ? '已暂停'
                  : isCreator
                    ? `先看前 ${DATA_PAGE} 项 · 可拖动排序`
                    : '点选查看'}
            </span>
          </div>
          <div className="plaza-dual-rail-stack">
            {visibleFuncNodes.map((node, i) => {
              const isStep = node.kind === 'step'
              const stepIdx = isStep ? node.stepIndex : -1
              return (
                <div key={node.id} className="plaza-dual-rail-connector">
                  {i > 0 && <span className="plaza-dual-rail-vline" aria-hidden />}
                  <FuncNode
                    id={node.id}
                    label={node.label}
                    sub={node.sub}
                    active={activeNodeId === node.id}
                    running={runningNodeId === node.id}
                    draggable={
                      isStep
                      && isCreator
                      && !(run.phase === 'running' || run.phase === 'paused')
                    }
                    isDragging={isStep && dragIndex === stepIdx}
                    isDragOver={
                      isStep
                      && overIndex === stepIdx
                      && dragIndex !== null
                      && dragIndex !== stepIdx
                    }
                    stepIndex={isStep ? stepIdx : undefined}
                    onSelect={() =>
                      selectNode(node.id, node.kind === 'egress' ? 'output' : 'input')
                    }
                    onGripDown={(e) => {
                      if (!isStep || !isCreator || run.phase === 'running' || run.phase === 'paused') return
                      if (e.button !== 0) return
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      dragPointerIdRef.current = e.pointerId
                      setDragIndex(stepIdx)
                      setOverIndex(stepIdx)
                    }}
                  />
                </div>
              )
            })}
            {funcRemaining > 0 && (
              <button
                type="button"
                className="plaza-dual-rail-load-more"
                onClick={() => setFuncVisible((n) => Math.min(n + DATA_PAGE, funcChain.length))}
              >
                展开更多能力（还有 {funcRemaining} 项）
              </button>
            )}
          </div>
        </div>

        <div className="plaza-dual-rail-bridge" aria-hidden>
          {visibleDataRows.map((row) => (
            <span
              key={row.id}
              className={`plaza-dual-rail-link${activeNodeId === row.id ? ' active' : ''}`}
            />
          ))}
        </div>

        <div className="plaza-dual-rail-col data-col">
          <div className="plaza-dual-rail-col-head">
            <span className="plaza-mflow-chev">&gt;&gt;</span> 数据编排
            <span className="plaza-dual-rail-col-hint">先看前 {DATA_PAGE} 项 · 可继续展开</span>
          </div>
          <div className="plaza-dual-rail-stack">
            {visibleDataRows.map((row, i) => (
              <div key={row.id} className="plaza-dual-rail-connector data">
                {i > 0 && <span className="plaza-dual-rail-vline data" />}
                <DataNodePair
                  nodeId={row.id}
                  inputApi={row.input}
                  outputApi={row.output}
                  active={activeNodeId === row.id}
                  activeSide={activeNodeId === row.id ? activeApiSide : null}
                  running={runningNodeId === row.id}
                  onSelect={(side) => selectNode(row.id, side)}
                />
              </div>
            ))}
            {dataRemaining > 0 && (
              <button
                type="button"
                className="plaza-dual-rail-load-more"
                onClick={() => setDataVisible((n) => Math.min(n + DATA_PAGE, dataRows.length))}
              >
                展开更多数据（还有 {dataRemaining} 项）
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="plaza-dual-rail-cross-hint">
        点选左侧能力或右侧数据，在下方继续编辑与试运营
        {canMutate ? ' · 也可用指令快速操作' : ''}
      </p>

      {editingId && activeStep && canMutate && (
        <div className="plaza-dual-rail-edit">
          <input
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder={`${activeStep.label} 数据流说明`}
            aria-label="节点说明"
          />
          <button type="button" className="btn-ghost-sm" onClick={() => setEditingId(null)}>取消</button>
          <button type="button" className="btn-primary-sm" onClick={saveEdit}>保存</button>
        </div>
      )}

      {(isCreator || Boolean(activeApiNode)) && (
        <div ref={dockRef}>
        <FlowOrchestrationDock
          activeNodeId={activeNodeId}
          activeStep={activeStep}
          activeApiNode={activeApiNode}
          activeApiSide={activeApiSide}
          isCreator={isCreator}
          pickerOpen={
            canMutate && (
              pickerAfterStepId === activeNodeId
              || (pickerAfterStepId === FLOW_INGRESS_ID && activeNodeId === FLOW_INGRESS_ID)
            )
          }
          availableModules={availableModules}
          flowLabels={flowLabels}
          nodeLabels={nodeLabels}
          appName={appName}
          analysisText={analysis}
          onOpenNodeByLabel={openNodeByLabel}
          onAddModule={() => {
            if (!canMutate) return
            if (activeNodeId === FLOW_INGRESS_ID) {
              setPickerAfterStepId(FLOW_INGRESS_ID)
              return
            }
            if (activeStep) {
              setPickerAfterStepId(pickerAfterStepId === activeStep.id ? null : activeStep.id)
            } else if (flow.steps.length > 0) {
              const last = flow.steps[flow.steps.length - 1]
              selectNode(last.id, 'input')
              setPickerAfterStepId(last.id)
            }
          }}
          onEditNote={startEdit}
          onDelete={() => {
            if (!activeStep || !canMutate) return
            const next = removeFlowStep(flow, activeStep.id)
            setFlow(next)
            selectNode(next.steps[0]?.id ?? FLOW_INGRESS_ID, 'input')
            setPickerAfterStepId(null)
          }}
          onPickModule={(mod) => {
            const afterId =
              activeNodeId === FLOW_INGRESS_ID
                ? FLOW_INGRESS_ID
                : activeStep?.id ?? flow.steps[flow.steps.length - 1]?.id ?? null
            handleAddFromCatalog(mod, afterId)
          }}
          onClosePicker={() => setPickerAfterStepId(null)}
          onInsertModule={(mod) => {
            const afterId =
              activeNodeId === FLOW_INGRESS_ID
                ? FLOW_INGRESS_ID
                : activeStep?.id ?? flow.steps[flow.steps.length - 1]?.id ?? null
            handleAddFromCatalog(mod, afterId)
          }}
          onSaveNote={(note) => {
            if (activeStep && canMutate) {
              setFlow(updateFlowStep(flow, activeStep.id, { note }))
            }
          }}
          onAnalyze={setAnalysis}
        />
        </div>
      )}
    </div>
  )
}
