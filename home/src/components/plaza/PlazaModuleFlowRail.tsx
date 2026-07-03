import { useState } from 'react'
import type { FlowRailTag } from '../../lib/plazaModuleFlow'

interface Props {
  tags: FlowRailTag[]
  activeStepId: string | null
  onSelect?: (stepId: string) => void
  dimmed?: boolean
  label: string
  readOnly?: boolean
}

export default function PlazaModuleFlowRail({
  tags,
  activeStepId,
  onSelect,
  dimmed,
  label,
  readOnly,
}: Props) {
  const [paused, setPaused] = useState(false)

  if (tags.length === 0) {
    return (
      <div className={`plaza-mflow-rail plaza-mflow-rail--empty${dimmed ? ' dimmed' : ''}`} aria-label={label}>
        <span className="plaza-mflow-rail-empty">暂无模块节点</span>
      </div>
    )
  }

  return (
    <div
      className={`plaza-mflow-rail${dimmed ? ' dimmed' : ''}${paused ? ' paused' : ''}`}
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {tags.map((tag) => (
        <button
          key={tag.stepId}
          type="button"
          className={`plaza-mflow-tag${activeStepId === tag.stepId ? ' active' : ''}`}
          style={{
            animationDuration: `${tag.durationSec}s`,
            animationDelay: `${tag.delaySec}s`,
          }}
          onClick={() => onSelect?.(tag.stepId)}
          disabled={readOnly && !onSelect}
          aria-pressed={activeStepId === tag.stepId}
        >
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
          {tag.label} · {tag.note}
        </button>
      ))}
    </div>
  )
}
