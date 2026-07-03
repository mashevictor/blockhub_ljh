import { useEffect, useState } from 'react'
import type { AppModuleFlow, ModuleFlowStep } from '../../lib/plazaModuleFlow'
import {
  addFlowStep,
  buildFlowRailTags,
  loadModuleFlow,
  moveFlowStep,
  removeFlowStep,
  splitFlowRails,
  updateFlowStep,
} from '../../lib/plazaModuleFlow'
import PlazaModuleFlowRail from './PlazaModuleFlowRail'

interface Props {
  appKey: string
  appName: string
  moduleLabels: string[]
  isCreator: boolean
  compact?: boolean
}

export default function PlazaModuleFlowPanel({
  appKey,
  appName,
  moduleLabels,
  isCreator,
  compact,
}: Props) {
  const [flow, setFlow] = useState<AppModuleFlow>(() => loadModuleFlow(appKey, moduleLabels))
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    const loaded = loadModuleFlow(appKey, moduleLabels)
    setFlow(loaded)
    setActiveStepId(loaded.steps[0]?.id ?? null)
    setEditingId(null)
  }, [appKey, moduleLabels.join('|')])

  const { railIn, railOut } = splitFlowRails(flow.steps)
  const railInTags = buildFlowRailTags(railIn, 0)
  const railOutTags = buildFlowRailTags(railOut, 1)

  const startEdit = (step: ModuleFlowStep) => {
    if (!isCreator) return
    setEditingId(step.id)
    setEditNote(step.note)
  }

  const saveEdit = () => {
    if (!editingId) return
    setFlow(updateFlowStep(flow, editingId, { note: editNote }))
    setEditingId(null)
  }

  const handleAdd = () => {
    if (!newLabel.trim()) return
    const next = addFlowStep(flow, newLabel, newNote || undefined)
    setFlow(next)
    setNewLabel('')
    setNewNote('')
    setActiveStepId(next.steps[next.steps.length - 1]?.id ?? null)
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

      <div className="plaza-mflow-stage">
        <PlazaModuleFlowRail
          tags={railInTags}
          activeStepId={activeStepId}
          onSelect={setActiveStepId}
          label="输入链"
        />
        {railOutTags.length > 0 && (
          <PlazaModuleFlowRail
            tags={railOutTags}
            activeStepId={activeStepId}
            onSelect={setActiveStepId}
            dimmed
            label="输出链"
          />
        )}
      </div>

      {activeStepId && (
        <div className="plaza-mflow-detail">
          {(() => {
            const step = flow.steps.find((s) => s.id === activeStepId)
            if (!step) return null
            if (editingId === step.id) {
              return (
                <div className="plaza-mflow-edit">
                  <strong>{step.label}</strong>
                  <input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="描述此节点的数据流…"
                    aria-label="节点说明"
                  />
                  <div className="plaza-mflow-edit-actions">
                    <button type="button" className="btn-ghost-sm" onClick={() => setEditingId(null)}>取消</button>
                    <button type="button" className="btn-primary-sm" onClick={saveEdit}>保存</button>
                  </div>
                </div>
              )
            }
            return (
              <div className="plaza-mflow-step">
                <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.note}</p>
                </div>
                {isCreator && (
                  <div className="plaza-mflow-step-actions">
                    <button type="button" className="btn-ghost-sm" onClick={() => startEdit(step)}>编辑</button>
                    <button type="button" className="btn-ghost-sm" onClick={() => setFlow(moveFlowStep(flow, step.id, -1))}>↑</button>
                    <button type="button" className="btn-ghost-sm" onClick={() => setFlow(moveFlowStep(flow, step.id, 1))}>↓</button>
                    <button type="button" className="btn-ghost-sm danger" onClick={() => {
                      const next = removeFlowStep(flow, step.id)
                      setFlow(next)
                      setActiveStepId(next.steps[0]?.id ?? null)
                    }}>删除</button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {isCreator && (
        <div className="plaza-mflow-add">
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
          <button type="button" className="btn-primary-sm" onClick={handleAdd} disabled={!newLabel.trim()}>
            + 添加节点
          </button>
        </div>
      )}
    </section>
  )
}
