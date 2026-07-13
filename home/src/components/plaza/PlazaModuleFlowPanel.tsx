import { useEffect, useMemo, useRef, useState } from 'react'
import {
  modulesAvailableToAdd,
  type ModuleCapability,
} from '../../data/moduleCatalog'
import type { AppModuleFlow, ModuleFlowStep } from '../../lib/plazaModuleFlow'
import {
  addFlowStep,
  insertFlowStepAfter,
  loadModuleFlow,
  reorderFlowSteps,
  removeFlowStep,
  updateFlowStep,
} from '../../lib/plazaModuleFlow'
import PlazaModuleFlowPipeline from './PlazaModuleFlowPipeline'
import FlowOrchestrationDock from './FlowOrchestrationDock'
import { ModuleApiPanel } from './ModuleApiPanel'
import {
  FLOW_INGRESS_ID,
} from '../../lib/plazaModuleFlow'

interface Props {
  appKey: string
  appName: string
  moduleLabels: string[]
  isCreator: boolean
  compact?: boolean
  orchestration?: boolean
}

export default function PlazaModuleFlowPanel({
  appKey,
  appName,
  moduleLabels,
  isCreator,
  compact,
  orchestration,
}: Props) {
  const [flow, setFlow] = useState<AppModuleFlow>(() => loadModuleFlow(appKey, moduleLabels))
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [pickerAfterStepId, setPickerAfterStepId] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const apiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loaded = loadModuleFlow(appKey, moduleLabels)
    setFlow(loaded)
    setActiveNodeId(loaded.steps[0]?.id ?? FLOW_INGRESS_ID)
    setEditingId(null)
    setPickerAfterStepId(null)
  }, [appKey, moduleLabels.join('|')])

  const existingLabels = useMemo(() => flow.steps.map((s) => s.label), [flow.steps])
  const availableModules = useMemo(
    () => modulesAvailableToAdd(existingLabels),
    [existingLabels],
  )

  const activeStep = flow.steps.find((s) => s.id === activeNodeId) ?? null

  const startEdit = (step: ModuleFlowStep) => {
    if (!isCreator) return
    setEditingId(step.id)
    setEditNote(step.note)
    setPickerAfterStepId(null)
  }

  const saveEdit = () => {
    if (!editingId) return
    setFlow(updateFlowStep(flow, editingId, { note: editNote }))
    setEditingId(null)
  }

  const handleAddFromCatalog = (mod: ModuleCapability, afterStepId: string | null) => {
    const idx = afterStepId ? flow.steps.findIndex((s) => s.id === afterStepId) : -1
    const next = insertFlowStepAfter(flow, afterStepId, mod.label, mod.flowHint)
    setFlow(next)
    const newStepId =
      idx >= 0 ? next.steps[idx + 1]?.id : next.steps[next.steps.length - 1]?.id
    setActiveNodeId(newStepId ?? null)
    setPickerAfterStepId(null)
  }

  const handleManualAdd = () => {
    if (!newLabel.trim()) return
    const next = addFlowStep(flow, newLabel)
    setFlow(next)
    setNewLabel('')
    setActiveNodeId(next.steps[next.steps.length - 1]?.id ?? null)
  }

  return (
    <section
      className={`plaza-mflow-panel${compact ? ' compact' : ''}${orchestration ? ' orchestration' : ''}`}
      aria-label={`${appName} 模块数据流`}
    >
      {!orchestration && (
        <header className="plaza-mflow-head">
          <h3>
            <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
            {appName} · 模块数据流
          </h3>
          {isCreator && <span className="plaza-mflow-badge">创建者 · 可编辑</span>}
        </header>
      )}

      <div className={`plaza-mflow-stage${orchestration ? ' orchestration' : ''}`}>
        <PlazaModuleFlowPipeline
          steps={flow.steps}
          activeNodeId={activeNodeId}
          onSelect={(id) => {
            setActiveNodeId(id)
            setPickerAfterStepId(null)
            setEditingId(null)
          }}
          readOnly={!isCreator}
          draggable={isCreator}
          orchestration={orchestration}
          onReorder={(from, to) => setFlow((prev) => reorderFlowSteps(prev, from, to))}
        />
      </div>

      {orchestration && isCreator && (
        <>
          {editingId && activeStep && (
            <div className="plaza-mflow-edit plaza-orch-inline-edit">
              <p className="plaza-mflow-edit-label">
                编辑 <strong>{activeStep.label}</strong> 的数据流说明
              </p>
              <input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="描述此节点的数据流"
                aria-label="节点说明"
              />
              <div className="plaza-mflow-edit-actions">
                <button type="button" className="btn-ghost-sm" onClick={() => setEditingId(null)}>取消</button>
                <button type="button" className="btn-primary-sm" onClick={saveEdit}>保存</button>
              </div>
            </div>
          )}

          <FlowOrchestrationDock
            activeNodeId={activeNodeId}
            activeStep={activeStep}
            activeApiNode={null}
            activeApiSide={null}
            isCreator={isCreator}
            pickerOpen={pickerAfterStepId === activeNodeId && !!activeStep}
            availableModules={availableModules}
            onAddModule={() => {
              if (activeStep) setPickerAfterStepId(pickerAfterStepId === activeStep.id ? null : activeStep.id)
            }}
            onEditNote={() => activeStep && startEdit(activeStep)}
            onDelete={() => {
              if (!activeStep) return
              const next = removeFlowStep(flow, activeStep.id)
              setFlow(next)
              setActiveNodeId(next.steps[0]?.id ?? FLOW_INGRESS_ID)
              setPickerAfterStepId(null)
            }}
            onPickModule={(mod) => handleAddFromCatalog(mod, activeStep?.id ?? null)}
            onClosePicker={() => setPickerAfterStepId(null)}
          />

          <div className="plaza-orch-advanced">
            <button
              type="button"
              className="plaza-orch-advanced-toggle"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? '收起' : '高级'} · API 拨通与自定义模块
            </button>
            {showAdvanced && (
              <div className="plaza-orch-advanced-body">
                <div ref={apiRef}>
                  <ModuleApiPanel
                    appKey={appKey}
                    appName={appName}
                    steps={flow.steps}
                    activeNodeId={activeNodeId}
                  />
                </div>
                <div className="plaza-mflow-add">
                  <p className="plaza-mflow-add-title">
                    <span className="plaza-mflow-chev">&gt;</span> 手动添加模块
                  </p>
                  <div className="plaza-mflow-add-row">
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="模块名称"
                      aria-label="新模块名称"
                    />
                    <button type="button" className="btn-primary-sm" onClick={handleManualAdd} disabled={!newLabel.trim()}>
                      + 添加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!orchestration && (
        <>
          <ModuleApiPanel
            appKey={appKey}
            appName={appName}
            steps={flow.steps}
            activeNodeId={activeNodeId}
          />

          {activeNodeId && activeStep && isCreator && (
            <div className="plaza-mflow-detail">
              {editingId === activeStep.id ? (
                <div className="plaza-mflow-edit">
                  <input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="数据流说明"
                    aria-label="节点说明"
                  />
                  <div className="plaza-mflow-edit-actions">
                    <button type="button" className="btn-ghost-sm" onClick={() => setEditingId(null)}>取消</button>
                    <button type="button" className="btn-primary-sm" onClick={saveEdit}>保存</button>
                  </div>
                </div>
              ) : (
                <div className="plaza-mflow-step">
                  <span className="plaza-mflow-chev">&gt;&gt;</span>
                  <div className="plaza-mflow-step-main"><strong>{activeStep.label}</strong></div>
                  <div className="plaza-mflow-step-actions">
                    <button type="button" className="btn-primary-sm" onClick={() => startEdit(activeStep)}>编辑说明</button>
                    <button type="button" className="btn-ghost-sm danger" onClick={() => {
                      const next = removeFlowStep(flow, activeStep.id)
                      setFlow(next)
                      setActiveNodeId(next.steps[0]?.id ?? FLOW_INGRESS_ID)
                    }}>删除</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
