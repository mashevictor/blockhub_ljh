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

interface Props {
  appKey: string
  appName: string
  moduleLabels: string[]
  isCreator: boolean
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
        disabled={readOnly}
        aria-pressed={active}
      >
        <span className="plaza-dual-rail-node-label">{label}</span>
        {sub && <span className="plaza-dual-rail-node-sub">{sub}</span>}
      </button>
    </div>
  )
}

function DataNode({
  id,
  method,
  path,
  active,
  running,
  onSelect,
}: {
  id: string
  method: string
  path: string
  active: boolean
  running?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`plaza-dual-rail-node data${active ? ' active' : ''}${running ? ' running' : ''}`}
      data-node-id={id}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className={`plaza-dual-rail-method method-${method.toLowerCase()}`}>{method}</span>
      <span className="plaza-dual-rail-path">{path}</span>
    </button>
  )
}

export default function PlazaDualRailFlowPanel({
  appKey,
  appName,
  moduleLabels,
  isCreator,
}: Props) {
  const [flow, setFlow] = useState<AppModuleFlow>(() => loadModuleFlow(appKey, moduleLabels))
  const run = usePlazaFlowRun()
  const [activeNodeId, setActiveNodeId] = useState<string | null>(FLOW_INGRESS_ID)
  const [pickerAfterStepId, setPickerAfterStepId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
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
    setEditingId(null)
    setPickerAfterStepId(null)
  }, [appKey, moduleLabels.join('|')])

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

  const finishDrag = useCallback((from: number, to: number) => {
    if (from !== to && from >= 0 && to >= 0) {
      setFlow((prev) => reorderFlowSteps(prev, from, to))
    }
    setDragIndex(null)
    setOverIndex(null)
  }, [])

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

  const handleAddFromCatalog = (mod: ModuleCapability) => {
    const afterId = activeStep?.id ?? flow.steps[flow.steps.length - 1]?.id ?? null
    const next = insertFlowStepAfter(flow, afterId, mod.label, mod.flowHint)
    setFlow(next)
    const idx = afterId ? next.steps.findIndex((s) => s.id === afterId) : -1
    const newId = idx >= 0 ? next.steps[idx + 1]?.id : next.steps[next.steps.length - 1]?.id
    setActiveNodeId(newId ?? null)
    setPickerAfterStepId(null)
  }

  const dataRows = useMemo(() => {
    return buildFlowApiNodeList(flow.steps).map((n) => {
      const api = apiNodes.get(n.node_id)
      const ep = api?.output_api ?? api?.input_api
      return {
        id: n.node_id,
        method: ep?.method ?? '—',
        path: ep?.path ?? '—',
      }
    })
  }, [flow.steps, apiNodes])

  const startEdit = () => {
    if (!activeStep || !isCreator) return
    setEditingId(activeStep.id)
    setEditNote(activeStep.note)
    setPickerAfterStepId(null)
  }

  const saveEdit = () => {
    if (!editingId) return
    setFlow(updateFlowStep(flow, editingId, { note: editNote }))
    setEditingId(null)
  }

  return (
    <div className="plaza-dual-rail-panel" aria-label={`${appName} 双轨编排`}>
      <div className="plaza-dual-rail-grid">
        <div className="plaza-dual-rail-col">
          <div className="plaza-dual-rail-col-head">
            <span className="plaza-mflow-chev">&gt;&gt;</span> 功能编排轨
            <span className="plaza-dual-rail-col-hint">
              {run.phase === 'running'
                ? '执行中'
                : run.phase === 'paused'
                  ? '已暂停'
                  : isCreator
                    ? '可拖序 · 点击选中'
                    : '只读'}
            </span>
          </div>
          <div className="plaza-dual-rail-stack">
            <FuncNode
              id={FLOW_INGRESS_ID}
              label="📥 用户意图"
              sub="业务请求进入"
              active={activeNodeId === FLOW_INGRESS_ID}
              running={runningNodeId === FLOW_INGRESS_ID}
              readOnly={!isCreator}
              onSelect={() => setActiveNodeId(FLOW_INGRESS_ID)}
            />
            {flow.steps.map((step, i) => (
              <div key={step.id} className="plaza-dual-rail-connector" aria-hidden>
                <span className="plaza-dual-rail-vline" />
                <FuncNode
                  id={step.id}
                  label={step.label}
                  sub={getModuleCapability(step.label)?.desc ?? step.note}
                  active={activeNodeId === step.id}
                  running={runningNodeId === step.id}
                  draggable={isCreator}
                  isDragging={dragIndex === i}
                  isDragOver={overIndex === i && dragIndex !== null && dragIndex !== i}
                  stepIndex={i}
                  readOnly={!isCreator}
                  onSelect={() => {
                    setActiveNodeId(step.id)
                    setEditingId(null)
                    setPickerAfterStepId(null)
                  }}
                  onGripDown={(e) => {
                    if (e.button !== 0) return
                    e.preventDefault()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    dragPointerIdRef.current = e.pointerId
                    setDragIndex(i)
                    setOverIndex(i)
                  }}
                />
              </div>
            ))}
            <div className="plaza-dual-rail-connector" aria-hidden>
              <span className="plaza-dual-rail-vline" />
              <FuncNode
                id={FLOW_EGRESS_ID}
                label="📤 网页 + App"
                sub="触达输出"
                active={activeNodeId === FLOW_EGRESS_ID}
                running={runningNodeId === FLOW_EGRESS_ID}
                readOnly={!isCreator}
                onSelect={() => setActiveNodeId(FLOW_EGRESS_ID)}
              />
            </div>
          </div>
        </div>

        <div className="plaza-dual-rail-bridge" aria-hidden>
          {dataRows.map((row) => (
            <span
              key={row.id}
              className={`plaza-dual-rail-link${activeNodeId === row.id ? ' active' : ''}`}
            />
          ))}
        </div>

        <div className="plaza-dual-rail-col data-col">
          <div className="plaza-dual-rail-col-head">
            <span className="plaza-mflow-chev">&gt;&gt;</span> 数据编排轨
            <span className="plaza-dual-rail-col-hint">自动生成 · 只读</span>
          </div>
          <div className="plaza-dual-rail-stack">
            {dataRows.map((row, i) => (
              <div key={row.id} className="plaza-dual-rail-connector data">
                {i > 0 && <span className="plaza-dual-rail-vline data" />}
                <DataNode
                  id={row.id}
                  method={row.method}
                  path={row.path}
                  active={activeNodeId === row.id}
                  running={runningNodeId === row.id}
                  onSelect={() => setActiveNodeId(row.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="plaza-dual-rail-cross-hint">
        ↔ 点击节点跨轨高亮 · {isCreator ? '⠿ 拖动排序 · + 添加 · 编辑 · 删除' : '创建者可编辑功能轨'}
      </p>

      {editingId && activeStep && (
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

      {isCreator && (
        <FlowOrchestrationDock
          activeNodeId={activeNodeId}
          activeStep={activeStep}
          isCreator={isCreator}
          pickerOpen={pickerAfterStepId === activeNodeId && !!activeStep}
          availableModules={availableModules}
          onAddModule={() => {
            if (activeStep) {
              setPickerAfterStepId(pickerAfterStepId === activeStep.id ? null : activeStep.id)
            } else if (flow.steps.length > 0) {
              const last = flow.steps[flow.steps.length - 1]
              setActiveNodeId(last.id)
              setPickerAfterStepId(last.id)
            }
          }}
          onEditNote={startEdit}
          onDelete={() => {
            if (!activeStep) return
            const next = removeFlowStep(flow, activeStep.id)
            setFlow(next)
            setActiveNodeId(next.steps[0]?.id ?? FLOW_INGRESS_ID)
            setPickerAfterStepId(null)
          }}
          onPickModule={handleAddFromCatalog}
          onClosePicker={() => setPickerAfterStepId(null)}
        />
      )}
    </div>
  )
}
