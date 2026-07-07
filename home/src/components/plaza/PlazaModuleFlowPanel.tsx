import { useEffect, useMemo, useState } from 'react'
import {
  getModuleCapability,
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
import ModuleApiPanel from './ModuleApiPanel'
import ModuleReorderStrip from './ModuleReorderStrip'
import {
  FLOW_EGRESS_ID,
  FLOW_INGRESS_ID,
} from '../../lib/plazaModuleFlow'

const FLOW_HELP_KEY = 'blockhub-mflow-hint-dismissed'

interface Props {
  appKey: string
  appName: string
  moduleLabels: string[]
  isCreator: boolean
  compact?: boolean
}

function FlowHelpGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="plaza-mflow-help" role="note">
      <div className="plaza-mflow-help-head">
        <span className="plaza-mflow-help-icon" aria-hidden>💡</span>
        <strong>三步调整模块数据流</strong>
      </div>
      <ol className="plaza-mflow-help-steps">
        <li>
          <span className="plaza-mflow-help-num">1</span>
          <span>在上方<strong>模块顺序</strong>栏按住 ⠿ 拖动排序，或点击节点查看能力说明</span>
        </li>
        <li>
          <span className="plaza-mflow-help-num">2</span>
          <span>输入链负责采集理解，输出链负责处理触达，中间经<strong>数据中转</strong>衔接</span>
        </li>
        <li>
          <span className="plaza-mflow-help-num">3</span>
          <span>点<strong>拨通全部模块</strong>，为各节点配置数据流入与流出；可点击输入/输出节点查看</span>
        </li>
      </ol>
      <button type="button" className="plaza-mflow-help-dismiss" onClick={onDismiss}>
        知道了，不再提示
      </button>
    </div>
  )
}

function ModuleCapabilityCard({ step }: { step: ModuleFlowStep }) {
  const cap = getModuleCapability(step.label)
  return (
    <div className="plaza-mflow-capability">
      <div className="plaza-mflow-capability-icon" aria-hidden>
        {cap?.icon ?? '🧩'}
      </div>
      <div className="plaza-mflow-capability-body">
        <p className="plaza-mflow-capability-title">
          模块能力
          {cap?.category && <span className="plaza-mflow-capability-cat">{cap.category}</span>}
        </p>
        <p className="plaza-mflow-capability-desc">
          {cap?.desc ?? '该模块参与应用数据流，可在下方编辑具体流转说明。'}
        </p>
        <p className="plaza-mflow-capability-flow">
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
          数据流：{step.note}
        </p>
      </div>
    </div>
  )
}

function ModulePicker({
  options,
  onPick,
  onClose,
}: {
  options: ModuleCapability[]
  onPick: (mod: ModuleCapability) => void
  onClose: () => void
}) {
  if (options.length === 0) {
    return (
      <div className="plaza-mflow-picker">
        <p className="plaza-mflow-picker-empty">推荐模块已全部添加，可在底部手动输入自定义名称。</p>
        <button type="button" className="btn-ghost-sm" onClick={onClose}>关闭</button>
      </div>
    )
  }
  return (
    <div className="plaza-mflow-picker">
      <div className="plaza-mflow-picker-head">
        <span className="plaza-mflow-chev" aria-hidden>&gt;</span>
        <strong>选择要添加的模块</strong>
        <button type="button" className="plaza-mflow-picker-close" onClick={onClose} aria-label="关闭">×</button>
      </div>
      <div className="plaza-mflow-picker-grid">
        {options.map((mod) => (
          <button
            key={mod.label}
            type="button"
            className="plaza-mflow-picker-item"
            onClick={() => onPick(mod)}
          >
            <span className="plaza-mflow-picker-icon" aria-hidden>{mod.icon}</span>
            <span className="plaza-mflow-picker-label">{mod.label}</span>
            <span className="plaza-mflow-picker-desc">{mod.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PlazaModuleFlowPanel({
  appKey,
  appName,
  moduleLabels,
  isCreator,
  compact,
}: Props) {
  const [flow, setFlow] = useState<AppModuleFlow>(() => loadModuleFlow(appKey, moduleLabels))
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newNote, setNewNote] = useState('')
  const [pickerAfterStepId, setPickerAfterStepId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(() => {
    try {
      return isCreator && localStorage.getItem(FLOW_HELP_KEY) !== '1'
    } catch {
      return isCreator
    }
  })

  const dismissHelp = () => {
    setShowHelp(false)
    try {
      localStorage.setItem(FLOW_HELP_KEY, '1')
    } catch {
      /* ignore */
    }
  }

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
    const next = addFlowStep(flow, newLabel, newNote || undefined)
    setFlow(next)
    setNewLabel('')
    setNewNote('')
    setActiveNodeId(next.steps[next.steps.length - 1]?.id ?? null)
  }

  return (
    <section className={`plaza-mflow-panel${compact ? ' compact' : ''}`} aria-label={`${appName} 模块数据流`}>
      <header className="plaza-mflow-head">
        <h3>
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
          {appName} · 模块数据流
        </h3>
        {isCreator && <span className="plaza-mflow-badge">创建者 · 可编辑</span>}
      </header>

      {isCreator && showHelp && <FlowHelpGuide onDismiss={dismissHelp} />}

      <p className="plaza-mflow-rail-hint">
        {isCreator
          ? '先在「模块顺序」栏拖拽调整顺序，数据流图会同步更新'
          : '完整模块数据流如下'}
      </p>

      <div className="plaza-mflow-stage">
        {isCreator && flow.steps.length > 0 && (
          <ModuleReorderStrip
            steps={flow.steps}
            activeNodeId={activeNodeId}
            onSelect={(id) => {
              setActiveNodeId(id)
              setPickerAfterStepId(null)
              setEditingId(null)
            }}
            onReorder={(from, to) => setFlow(reorderFlowSteps(flow, from, to))}
          />
        )}
        <PlazaModuleFlowPipeline
          steps={flow.steps}
          activeNodeId={activeNodeId}
          onSelect={(id) => {
            setActiveNodeId(id)
            setPickerAfterStepId(null)
            setEditingId(null)
          }}
          readOnly={!isCreator}
        />
      </div>

      <ModuleApiPanel
        appKey={appKey}
        appName={appName}
        steps={flow.steps}
        activeNodeId={activeNodeId}
      />

      {activeNodeId && activeNodeId !== FLOW_INGRESS_ID && activeNodeId !== FLOW_EGRESS_ID ? (
        <div className="plaza-mflow-detail">
          {(() => {
            const step = flow.steps.find((s) => s.id === activeNodeId)
            if (!step) return null

            if (editingId === step.id) {
              return (
                <div className="plaza-mflow-edit">
                  <p className="plaza-mflow-edit-label">正在编辑数据流说明：<strong>{step.label}</strong></p>
                  <input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="描述此节点的数据流，如：用户提问 → AI 检索知识库 → 返回答案"
                    aria-label="节点说明"
                  />
                  <div className="plaza-mflow-edit-actions">
                    <button type="button" className="btn-ghost-sm" onClick={() => setEditingId(null)}>取消</button>
                    <button type="button" className="btn-primary-sm" onClick={saveEdit}>保存说明</button>
                  </div>
                </div>
              )
            }

            return (
              <>
                <div className="plaza-mflow-step">
                  <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
                  <div className="plaza-mflow-step-main">
                    <strong>{step.label}</strong>
                  </div>
                  {isCreator && (
                    <div className="plaza-mflow-step-actions">
                      <button
                        type="button"
                        className="btn-primary-sm plaza-mflow-add-module-btn"
                        onClick={() => setPickerAfterStepId(pickerAfterStepId === step.id ? null : step.id)}
                      >
                        <span className="plaza-mflow-chev" aria-hidden>&gt;</span> 添加模块
                      </button>
                      <button type="button" className="btn-ghost-sm" onClick={() => startEdit(step)} title="修改数据流说明">
                        编辑说明
                      </button>
                      <button type="button" className="btn-ghost-sm danger" title="移除此模块节点" onClick={() => {
                        const next = removeFlowStep(flow, step.id)
                        setFlow(next)
                        setActiveNodeId(next.steps[0]?.id ?? FLOW_INGRESS_ID)
                        setPickerAfterStepId(null)
                      }}>删除</button>
                    </div>
                  )}
                </div>

                <ModuleCapabilityCard step={step} />

                {isCreator && pickerAfterStepId === step.id && (
                  <ModulePicker
                    options={availableModules}
                    onPick={(mod) => handleAddFromCatalog(mod, step.id)}
                    onClose={() => setPickerAfterStepId(null)}
                  />
                )}
              </>
            )
          })()}
        </div>
      ) : activeNodeId === FLOW_INGRESS_ID || activeNodeId === FLOW_EGRESS_ID ? (
        <div className="plaza-mflow-detail plaza-mflow-detail--endpoint">
          <p className="plaza-mflow-endpoint-title">
            <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
            {activeNodeId === FLOW_INGRESS_ID ? '业务输入节点' : '触达输出节点'}
          </p>
          <p className="plaza-mflow-endpoint-desc">
            {activeNodeId === FLOW_INGRESS_ID
              ? '外部请求由此进入应用数据流，拨通后可查看流入与流出配置。'
              : '处理结果会推送到网页、手机或消息通知。'}
          </p>
        </div>
      ) : (
        <div className="plaza-mflow-detail plaza-mflow-detail--empty">
          <p>请点击上方数据流图中的模块节点，查看能力说明或编辑</p>
        </div>
      )}

      {isCreator && (
        <div className="plaza-mflow-add">
          <p className="plaza-mflow-add-title">
            <span className="plaza-mflow-chev" aria-hidden>&gt;</span>
            手动添加自定义模块
          </p>
          <p className="plaza-mflow-add-hint">不在推荐列表中？输入名称即可添加到底部数据流</p>
          <div className="plaza-mflow-add-row">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="模块名称，如 智能问答"
              aria-label="新模块名称"
            />
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="数据流说明（可选）"
              aria-label="新模块说明"
            />
            <button type="button" className="btn-primary-sm" onClick={handleManualAdd} disabled={!newLabel.trim()}>
              + 添加节点
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
