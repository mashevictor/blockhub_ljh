import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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
  hydrateModuleFlowFromRuntime,
  loadModuleFlow,
  removeFlowStep,
  reorderFlowSteps,
  updateFlowStep,
} from '../../lib/plazaModuleFlow'
import FlowOrchestrationDock from './FlowOrchestrationDock'
import PlazaWorkModeSwitch from './PlazaWorkModeSwitch'
import PlazaRunControls from './PlazaRunControls'

const DATA_PAGE = 5

export type DualRailMode = 'both' | 'func' | 'data'
export type CommandProfile = 'default' | 'shanghai'

interface Props {
  appKey: string
  appName: string
  moduleLabels: string[]
  isCreator: boolean
  /** 页内嵌入（广场 feed / 全屏）时显示顶栏模式切换 */
  embedded?: boolean
  /** 底部工作台从折叠展开时递增，左右轨重置为前 5 项 */
  pageResetSignal?: number
  /** B 方案：只显示功能轨 / 数据轨 / 双轨 */
  railMode?: DualRailMode
  /** >> 内置话术档案（上海话专属测试） */
  commandProfile?: CommandProfile
  webUrl?: string
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
  const t = useT()
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
          aria-label={t('home.plaza.rail.drag', { name: label })}
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
  railMode = 'both',
  commandProfile = 'default',
  webUrl = '',
}: Props) {
  const t = useT()
  const showFunc = railMode === 'both' || railMode === 'func'
  const showData = railMode === 'both' || railMode === 'data'
  const [flow, setFlow] = useState<AppModuleFlow>(() => loadModuleFlow(appKey, moduleLabels))
  const run = usePlazaFlowRun()
  // 广场恒只读：改模块/测接口请进 Runtime 对话改页
  const canMutate = false
  const openRuntime = () => {
    if (webUrl) window.open(webUrl, '_blank', 'noopener,noreferrer')
  }
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
    let cancelled = false
    const local = loadModuleFlow(appKey, moduleLabels)
    setFlow(local)
    setActiveNodeId(FLOW_INGRESS_ID)
    setActiveApiSide('input')
    setEditingId(null)
    setPickerAfterStepId(null)
    setAnalysis('')
    setDataVisible(DATA_PAGE)
    setFuncVisible(DATA_PAGE)
    void hydrateModuleFlowFromRuntime(appKey, moduleLabels).then((loaded) => {
      if (!cancelled) setFlow(loaded)
    })
    return () => {
      cancelled = true
    }
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
      {
        kind: 'ingress' as const,
        id: FLOW_INGRESS_ID,
        label: t('home.plaza.rail.ingress_label'),
        sub: t('home.plaza.rail.ingress_sub'),
        stepIndex: -1,
      },
      ...flow.steps.map((s, i) => ({
        kind: 'step' as const,
        id: s.id,
        label: s.label,
        sub: getModuleCapability(s.label)?.desc ?? s.note,
        stepIndex: i,
      })),
      {
        kind: 'egress' as const,
        id: FLOW_EGRESS_ID,
        label: t('home.plaza.rail.egress_label'),
        sub: t('home.plaza.rail.egress_sub'),
        stepIndex: -1,
      },
    ]
  }, [flow.steps, t])

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
    // 预览中点选节点 → 同步进度（并暂停自动，便于细看）
    if (run.phase === 'running' || run.phase === 'paused') {
      const previewIdx = run.steps.findIndex((s) => s.id === nodeId)
      if (previewIdx >= 0) run.goToStep(previewIdx)
    }
    requestAnimationFrame(() => {
      dockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const openNodeByLabel = (label: string, side: 'input' | 'output' = 'input') => {
    const norm = label.replace(/^📥\s*|^📤\s*/, '').trim()
    if (/用户意图|业务输入|业务请求|User intent|Business input|Business request/i.test(norm)) {
      selectNode(FLOW_INGRESS_ID, side === 'output' ? 'output' : 'input')
      return
    }
    if (/触达输出|网页\s*\+\s*App|网页|Reach output|Web\s*\+\s*App/i.test(norm)) {
      selectNode(FLOW_EGRESS_ID, 'output')
      return
    }
    const hit =
      flow.steps.find((s) => s.label === norm)
      ?? flow.steps.find((s) => s.label.includes(norm) || norm.includes(s.label))
    if (hit) selectNode(hit.id, side)
  }

  const nodeLabels = useMemo(
    () => [t('home.plaza.cmd.intent'), ...flow.steps.map((s) => s.label), t('home.plaza.cmd.output')],
    [flow.steps, t],
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
      className={[
        'plaza-dual-rail-panel',
        embedded ? 'is-embedded' : '',
        canMutate ? '' : 'is-run-locked',
        railMode !== 'both' ? `rail-${railMode}` : '',
      ].filter(Boolean).join(' ')}
      aria-label={t('home.plaza.rail.aria', { name: appName })}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {embedded && (
        <div className="plaza-dual-rail-embed-bar">
          <PlazaWorkModeSwitch />
          <PlazaRunControls compact />
          {webUrl ? (
            <button type="button" className="btn-primary-sm" onClick={openRuntime}>
              {t('home.plaza.exp.open_runtime')}
            </button>
          ) : null}
        </div>
      )}

      {run.phase === 'running' || run.phase === 'paused' ? (
        <p className="plaza-dual-rail-lock-banner plaza-dual-rail-readonly-banner" role="status">
          {t('home.plaza.rail.preview_banner', { progress: run.progressLabel })}
        </p>
      ) : null}

      <div className={`plaza-dual-rail-grid${railMode !== 'both' ? ' is-single' : ''}`}>
        {showFunc && (
          <div className="plaza-dual-rail-col">
            <div className="plaza-dual-rail-col-head">
              <span className="plaza-mflow-chev">&gt;&gt;</span> {t('home.plaza.rail.func_title')}
              <span className="plaza-dual-rail-col-hint">
                {run.phase === 'running'
                  ? t('home.plaza.rail.hint.running')
                  : run.phase === 'paused'
                    ? t('home.plaza.rail.hint.paused')
                    : t('home.plaza.rail.hint.idle')}
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
                      draggable={false}
                      isDragging={false}
                      isDragOver={false}
                      stepIndex={isStep ? stepIdx : undefined}
                      onSelect={() =>
                        selectNode(node.id, node.kind === 'egress' ? 'output' : 'input')
                      }
                      onGripDown={undefined}
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
                  {t('home.plaza.rail.more_func', { n: funcRemaining })}
                </button>
              )}
            </div>
          </div>
        )}

        {railMode === 'both' && (
          <div className="plaza-dual-rail-bridge" aria-hidden>
            {visibleDataRows.map((row) => (
              <span
                key={row.id}
                className={`plaza-dual-rail-link${activeNodeId === row.id ? ' active' : ''}`}
              />
            ))}
          </div>
        )}

        {showData && (
          <div className="plaza-dual-rail-col data-col">
            <div className="plaza-dual-rail-col-head">
              <span className="plaza-mflow-chev">&gt;&gt;</span> {t('home.plaza.rail.data_title')}
              <span className="plaza-dual-rail-col-hint">{t('home.plaza.rail.data_hint', { n: DATA_PAGE })}</span>
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
                  {t('home.plaza.rail.more_data', { n: dataRemaining })}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="plaza-dual-rail-cross-hint">
        {railMode === 'func'
          ? t('home.plaza.rail.cross.func')
          : railMode === 'data'
            ? t('home.plaza.rail.cross.data')
            : t('home.plaza.rail.cross.both')}
      </p>

      {editingId && activeStep && canMutate && (
        <div className="plaza-dual-rail-edit">
          <input
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder={t('home.plaza.rail.note_ph', { label: activeStep.label })}
            aria-label={t('home.plaza.rail.note_aria')}
          />
          <button type="button" className="btn-ghost-sm" onClick={() => setEditingId(null)}>{t('home.plaza.rail.cancel')}</button>
          <button type="button" className="btn-primary-sm" onClick={saveEdit}>{t('home.plaza.rail.save')}</button>
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
          appKey={appKey}
          webUrl={webUrl}
          commandProfile={commandProfile}
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
