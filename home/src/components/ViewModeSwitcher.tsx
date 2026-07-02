import type { ViewMode } from '../data/constants'
import {
  IconMessage,
  IconBuilding,
  IconPuzzle,
} from './icons'

const MODES: {
  id: ViewMode
  label: string
  icon: typeof IconMessage
  badge?: string
}[] = [
  { id: 'prompt', label: '描述需求', icon: IconMessage, badge: '推荐' },
  { id: 'industry', label: '按行业创建', icon: IconBuilding },
  { id: 'module', label: '自由搭配', icon: IconPuzzle },
]

interface Props {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export default function ViewModeSwitcher({ value, onChange }: Props) {
  return (
    <div className="view-mode-switcher" role="tablist" aria-label="创建方式">
      {MODES.map((m) => {
        const ModeIcon = m.icon
        const active = value === m.id
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`view-mode-segment${active ? ' active' : ''}`}
            onClick={() => onChange(m.id)}
          >
            <span className="view-mode-icon">
              <ModeIcon size={15} />
            </span>
            <span className="view-mode-label">{m.label}</span>
            {m.badge && <em className="view-mode-badge">{m.badge}</em>}
          </button>
        )
      })}
    </div>
  )
}
