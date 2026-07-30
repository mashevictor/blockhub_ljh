import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '@blockhub/i18n/react'
import { getModuleCapability } from '../../data/moduleCatalog'
import type { ModuleFlowStep } from '../../lib/plazaModuleFlow'
import { FLOW_EGRESS_ID, FLOW_INGRESS_ID, splitFlowRails } from '../../lib/plazaModuleFlow'

interface Props {
  steps: ModuleFlowStep[]
  activeNodeId: string | null
  onSelect: (nodeId: string) => void
  readOnly?: boolean
  draggable?: boolean
  onReorder?: (fromIndex: number, toIndex: number) => void
  orchestration?: boolean
}

function FlowArrow() {
  return (
    <div className="plaza-mflow-pipe-arrow" aria-hidden>
      <span className="plaza-mflow-pipe-arrow-line" />
      <span className="plaza-mflow-pipe-arrow-head plaza-mflow-chev">&gt;&gt;</span>
    </div>
  )
}

function EndpointNode({
  kind,
  active,
  onSelect,
  readOnly,
}: {
  kind: 'in' | 'out'
  active: boolean
  onSelect: () => void
  readOnly?: boolean
}) {
  const t = useT()
  const nodeId = kind === 'in' ? FLOW_INGRESS_ID : FLOW_EGRESS_ID
  const inner = kind === 'in' ? (
    <>
      <span className="plaza-mflow-pipe-endpoint-icon" aria-hidden>📥</span>
      <span className="plaza-mflow-pipe-endpoint-label">{t('home.plaza.mflow.biz_in')}</span>
      <span className="plaza-mflow-pipe-endpoint-sub">{t('home.plaza.mflow.biz_in_sub')}</span>
    </>
  ) : (
    <>
      <span className="plaza-mflow-pipe-endpoint-icon" aria-hidden>📤</span>
      <span className="plaza-mflow-pipe-endpoint-label">{t('home.plaza.mflow.biz_out')}</span>
      <span className="plaza-mflow-pipe-endpoint-sub">{t('home.plaza.mflow.biz_out_sub')}</span>
    </>
  )
  return (
    <button
      type="button"
      className={`plaza-mflow-pipe-endpoint plaza-mflow-pipe-endpoint--${kind === 'in' ? 'in' : 'out'}${active ? ' active' : ''}`}
      onClick={onSelect}
      disabled={readOnly}
      aria-pressed={active}
      title={kind === 'in' ? t('home.plaza.mflow.biz_in_title') : t('home.plaza.mflow.biz_out_title')}
      data-node-id={nodeId}
    >
      {inner}
    </button>
  )
}

function StepNode({
  step,
  displayIndex,
  globalIndex,
  active,
  onSelect,
  readOnly,
  draggable,
  isDragging,
  isDragOver,
  onGripDown,
}: {
  step: ModuleFlowStep
  displayIndex: number
  globalIndex: number
  active: boolean
  onSelect: () => void
  readOnly?: boolean
  draggable?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  onGripDown?: (e: React.PointerEvent<HTMLButtonElement>) => void
}) {
  const t = useT()
  const cap = getModuleCapability(step.label)
  return (
    <div
      className={`plaza-mflow-pipe-seg-wrap${isDragging ? ' dragging' : ''}${isDragOver ? ' drag-over' : ''}`}
      data-step-index={globalIndex}
    >
      {draggable && (
        <button
          type="button"
          className="plaza-mflow-drag-handle"
          aria-label={t('home.plaza.mflow.drag', { name: step.label })}
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
        className={`plaza-mflow-pipe-node${active ? ' active' : ''}${draggable ? ' draggable' : ''}${isDragging ? ' dragging' : ''}${isDragOver ? ' drag-over' : ''}`}
        onClick={onSelect}
        disabled={readOnly}
        aria-pressed={active}
        title={step.note}
      >
        <span className="plaza-mflow-pipe-node-num">{displayIndex}</span>
        <span className="plaza-mflow-pipe-node-icon" aria-hidden>{cap?.icon ?? '🧩'}</span>
        <span className="plaza-mflow-pipe-node-label">{step.label}</span>
        {!draggable && <span className="plaza-mflow-pipe-node-note">{step.note}</span>}
      </button>
    </div>
  )
}

function ZoneBlock({
  label,
  variant,
  children,
}: {
  label: string
  variant: 'in' | 'out'
  children: ReactNode
}) {
  return (
    <div className={`plaza-mflow-zone plaza-mflow-zone--${variant}`}>
      <div className="plaza-mflow-zone-head">
        <span className="plaza-mflow-zone-chev" aria-hidden>&gt;&gt;</span>
        <span className="plaza-mflow-zone-label">{label}</span>
      </div>
      <div className="plaza-mflow-zone-track">{children}</div>
    </div>
  )
}

export default function PlazaModuleFlowPipeline({
  steps,
  activeNodeId,
  onSelect,
  readOnly,
  draggable,
  onReorder,
  orchestration,
}: Props) {
  const t = useT()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const overIndexRef = useRef<number | null>(null)
  const dragPointerIdRef = useRef<number | null>(null)
  overIndexRef.current = overIndex

  const finishDrag = useCallback((from: number, to: number) => {
    if (from !== to && from >= 0 && to >= 0) {
      onReorder?.(from, to)
    }
    setDragIndex(null)
    setOverIndex(null)
  }, [onReorder])

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

  const { railIn, railOut } = splitFlowRails(steps)

  if (steps.length === 0) {
    return (
      <div className="plaza-mflow-pipeline plaza-mflow-pipeline--empty">
        <p>{t('home.plaza.mflow.empty')}</p>
      </div>
    )
  }

  const summary = [t('home.plaza.mflow.biz_in'), ...steps.map((s) => s.label), t('home.plaza.mflow.biz_out')].join(' → ')

  const renderStep = (step: ModuleFlowStep, displayIndex: number, globalIndex: number) => (
    <div key={step.id} className="plaza-mflow-pipe-seg">
      <FlowArrow />
      <StepNode
        step={step}
        displayIndex={displayIndex}
        globalIndex={globalIndex}
        active={activeNodeId === step.id}
        onSelect={() => onSelect(step.id)}
        readOnly={readOnly}
        draggable={draggable && !readOnly}
        isDragging={dragIndex === globalIndex}
        isDragOver={overIndex === globalIndex && dragIndex !== null && dragIndex !== globalIndex}
        onGripDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          dragPointerIdRef.current = e.pointerId
          setDragIndex(globalIndex)
          setOverIndex(globalIndex)
        }}
      />
    </div>
  )

  return (
    <div className={`plaza-mflow-pipeline${orchestration ? ' orchestration' : ''}`}>
      <div className="plaza-mflow-pipeline-head">
        <strong>
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span> {t('home.plaza.mflow.full_flow')}
        </strong>
        <span>
          {readOnly
            ? t('home.plaza.mflow.hint_ro')
            : draggable
              ? t('home.plaza.mflow.hint_drag')
              : t('home.plaza.mflow.hint_click')}
        </span>
      </div>

      <div className="plaza-mflow-pipeline-body">
        <ZoneBlock label={t('home.plaza.mflow.zone_in')} variant="in">
          <EndpointNode
            kind="in"
            active={activeNodeId === FLOW_INGRESS_ID}
            onSelect={() => onSelect(FLOW_INGRESS_ID)}
            readOnly={readOnly}
          />
          {railIn.map((step, i) => renderStep(step, i + 1, i))}
        </ZoneBlock>

        {railOut.length > 0 && (
          <div className="plaza-mflow-hub" aria-hidden>
            <div className="plaza-mflow-hub-line" />
            <span className="plaza-mflow-hub-badge plaza-mflow-chev">&gt;&gt;</span>
            <div className="plaza-mflow-hub-line" />
          </div>
        )}

        {railOut.length > 0 ? (
          <ZoneBlock label={t('home.plaza.mflow.zone_out')} variant="out">
            {railOut.map((step, i) => renderStep(step, railIn.length + i + 1, railIn.length + i))}
            <div className="plaza-mflow-pipe-seg">
              <FlowArrow />
              <EndpointNode
                kind="out"
                active={activeNodeId === FLOW_EGRESS_ID}
                onSelect={() => onSelect(FLOW_EGRESS_ID)}
                readOnly={readOnly}
              />
            </div>
          </ZoneBlock>
        ) : (
          <div className="plaza-mflow-pipe-tail">
            <FlowArrow />
            <EndpointNode
              kind="out"
              active={activeNodeId === FLOW_EGRESS_ID}
              onSelect={() => onSelect(FLOW_EGRESS_ID)}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {!orchestration && (
        <p className="plaza-mflow-pipeline-summary">
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
          {summary}
        </p>
      )}
    </div>
  )
}
