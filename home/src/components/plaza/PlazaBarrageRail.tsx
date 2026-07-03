import { useState } from 'react'
import type { BarrageTag } from '../../lib/plazaBarrage'

interface Props {
  tags: BarrageTag[]
  selectedId: string | null
  onSelect: (itemId: string) => void
  dimmed?: boolean
  label?: string
}

export default function PlazaBarrageRail({ tags, selectedId, onSelect, dimmed, label }: Props) {
  const [paused, setPaused] = useState(false)

  if (tags.length === 0) {
    return (
      <div className={`plaza-rail plaza-rail--empty${dimmed ? ' dimmed' : ''}`} aria-label={label}>
        <span className="plaza-rail-empty">暂无弹幕 · 发布 @公开 或 @部门 应用后出现在此轨</span>
      </div>
    )
  }

  return (
    <div
      className={`plaza-rail${dimmed ? ' dimmed' : ''}${paused ? ' paused' : ''}`}
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {tags.map((tag) => (
        <button
          key={`${tag.itemId}-${tag.durationSec}`}
          type="button"
          className={`plaza-rail-tag variant-${tag.variant}${selectedId === tag.itemId ? ' selected' : ''}`}
          style={{
            animationDuration: `${tag.durationSec}s`,
            animationDelay: `${tag.delaySec}s`,
          }}
          onClick={() => onSelect(tag.itemId)}
          aria-pressed={selectedId === tag.itemId}
        >
          <span className="plaza-rail-chev" aria-hidden>&gt;&gt;</span>
          {tag.label}
        </button>
      ))}
    </div>
  )
}
