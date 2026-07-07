import type { ReactNode } from 'react'
import { getModuleCapability } from '../../data/moduleCatalog'
import type { ModuleFlowStep } from '../../lib/plazaModuleFlow'
import { FLOW_EGRESS_ID, FLOW_INGRESS_ID, splitFlowRails } from '../../lib/plazaModuleFlow'

interface Props {
  steps: ModuleFlowStep[]
  activeNodeId: string | null
  onSelect: (nodeId: string) => void
  readOnly?: boolean
}

function FlowArrow() {
  return (
    <div className="plaza-mflow-pipe-arrow" aria-hidden>
      <span className="plaza-mflow-pipe-arrow-line" />
      <span className="plaza-mflow-pipe-arrow-head">›</span>
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
  const nodeId = kind === 'in' ? FLOW_INGRESS_ID : FLOW_EGRESS_ID
  const inner = kind === 'in' ? (
    <>
      <span className="plaza-mflow-pipe-endpoint-icon" aria-hidden>📥</span>
      <span className="plaza-mflow-pipe-endpoint-label">业务输入</span>
      <span className="plaza-mflow-pipe-endpoint-sub">用户 / 业务请求</span>
    </>
  ) : (
    <>
      <span className="plaza-mflow-pipe-endpoint-icon" aria-hidden>📤</span>
      <span className="plaza-mflow-pipe-endpoint-label">触达输出</span>
      <span className="plaza-mflow-pipe-endpoint-sub">团队可见</span>
    </>
  )
  return (
    <button
      type="button"
      className={`plaza-mflow-pipe-endpoint plaza-mflow-pipe-endpoint--${kind === 'in' ? 'in' : 'out'}${active ? ' active' : ''}`}
      onClick={onSelect}
      disabled={readOnly}
      aria-pressed={active}
      title={kind === 'in' ? '业务输入节点' : '触达输出节点'}
      data-node-id={nodeId}
    >
      {inner}
    </button>
  )
}

function StepNode({
  step,
  displayIndex,
  active,
  onSelect,
  readOnly,
}: {
  step: ModuleFlowStep
  displayIndex: number
  active: boolean
  onSelect: () => void
  readOnly?: boolean
}) {
  const cap = getModuleCapability(step.label)
  return (
    <button
      type="button"
      className={`plaza-mflow-pipe-node${active ? ' active' : ''}`}
      onClick={onSelect}
      disabled={readOnly}
      aria-pressed={active}
      title={step.note}
    >
      <span className="plaza-mflow-pipe-node-num">{displayIndex}</span>
      <span className="plaza-mflow-pipe-node-icon" aria-hidden>{cap?.icon ?? '🧩'}</span>
      <span className="plaza-mflow-pipe-node-label">{step.label}</span>
      <span className="plaza-mflow-pipe-node-note">{step.note}</span>
    </button>
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
}: Props) {
  const { railIn, railOut } = splitFlowRails(steps)

  if (steps.length === 0) {
    return (
      <div className="plaza-mflow-pipeline plaza-mflow-pipeline--empty">
        <p>暂无模块，请通过下方添加节点构建数据流</p>
      </div>
    )
  }

  const summary = ['业务输入', ...steps.map((s) => s.label), '触达输出'].join(' → ')

  const renderStep = (step: ModuleFlowStep, displayIndex: number) => (
    <div key={step.id} className="plaza-mflow-pipe-seg">
      <FlowArrow />
      <StepNode
        step={step}
        displayIndex={displayIndex}
        active={activeNodeId === step.id}
        onSelect={() => onSelect(step.id)}
        readOnly={readOnly}
      />
    </div>
  )

  return (
    <div className="plaza-mflow-pipeline">
      <div className="plaza-mflow-pipeline-head">
        <strong>完整数据流</strong>
        <span>{readOnly ? '点击模块节点可查看能力说明' : '上方「模块顺序」可拖拽排序 · 点击节点查看详情'}</span>
      </div>

      <div className="plaza-mflow-pipeline-body">
        <ZoneBlock label="输入链 · 采集与理解" variant="in">
          <EndpointNode
            kind="in"
            active={activeNodeId === FLOW_INGRESS_ID}
            onSelect={() => onSelect(FLOW_INGRESS_ID)}
            readOnly={readOnly}
          />
          {railIn.map((step, i) => renderStep(step, i + 1))}
        </ZoneBlock>

        {railOut.length > 0 && (
          <div className="plaza-mflow-hub" aria-hidden>
            <div className="plaza-mflow-hub-line" />
            <span className="plaza-mflow-hub-badge">⚡ 数据中转</span>
            <div className="plaza-mflow-hub-line" />
          </div>
        )}

        {railOut.length > 0 ? (
          <ZoneBlock label="输出链 · 处理与触达" variant="out">
            {railOut.map((step, i) => renderStep(step, railIn.length + i + 1))}
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

      <p className="plaza-mflow-pipeline-summary">
        <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
        {summary}
      </p>
    </div>
  )
}
