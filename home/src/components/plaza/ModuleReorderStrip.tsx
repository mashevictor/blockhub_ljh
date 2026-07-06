import { useCallback, useEffect, useRef, useState } from 'react'
import { getModuleCapability } from '../../data/moduleCatalog'
import type { ModuleFlowStep } from '../../lib/plazaModuleFlow'

interface Props {
  steps: ModuleFlowStep[]
  activeNodeId: string | null
  onSelect: (stepId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export default function ModuleReorderStrip({ steps, activeNodeId, onSelect, onReorder }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const overIndexRef = useRef<number | null>(null)
  overIndexRef.current = overIndex

  const finishDrag = useCallback((from: number, to: number) => {
    if (from !== to && from >= 0 && to >= 0) {
      onReorder(from, to)
    }
    setDragIndex(null)
    setOverIndex(null)
  }, [onReorder])

  useEffect(() => {
    if (dragIndex === null) return

    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const chip = el?.closest('[data-reorder-index]')
      if (chip) {
        const to = Number.parseInt(chip.getAttribute('data-reorder-index') ?? '', 10)
        if (!Number.isNaN(to)) setOverIndex(to)
      }
    }

    const onUp = () => {
      finishDrag(dragIndex, overIndexRef.current ?? dragIndex)
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

  if (steps.length === 0) return null

  return (
    <div className="plaza-mflow-reorder">
      <div className="plaza-mflow-reorder-head">
        <strong>模块顺序</strong>
        <span>按住左侧 <em>⠿</em> 拖动可调整顺序</span>
      </div>
      <div className="plaza-mflow-reorder-track">
        {steps.map((step, index) => {
          const cap = getModuleCapability(step.label)
          const isDragging = dragIndex === index
          const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
          return (
            <div
              key={step.id}
              data-reorder-index={index}
              className={`plaza-mflow-reorder-chip${activeNodeId === step.id ? ' active' : ''}${isDragging ? ' dragging' : ''}${isOver ? ' drag-over' : ''}`}
            >
              <button
                type="button"
                className="plaza-mflow-reorder-grip"
                aria-label={`拖动 ${step.label}`}
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  e.preventDefault()
                  setDragIndex(index)
                  setOverIndex(index)
                }}
              >
                ⠿
              </button>
              <button
                type="button"
                className="plaza-mflow-reorder-body"
                onClick={() => onSelect(step.id)}
              >
                <span className="plaza-mflow-reorder-num">{index + 1}</span>
                <span className="plaza-mflow-reorder-icon" aria-hidden>{cap?.icon ?? '🧩'}</span>
                <span className="plaza-mflow-reorder-label">{step.label}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
