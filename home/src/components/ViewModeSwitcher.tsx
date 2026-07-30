import { useT } from '@blockhub/i18n/react'
import type { ViewMode } from '../data/constants'
import {
  IconMessage,
  IconBuilding,
  IconPuzzle,
} from './icons'

const MODE_IDS: {
  id: ViewMode
  labelKey: string
  icon: typeof IconMessage
  badge?: boolean
}[] = [
  { id: 'prompt', labelKey: 'home.create.mode.prompt', icon: IconMessage, badge: true },
  { id: 'industry', labelKey: 'home.create.mode.industry', icon: IconBuilding },
  { id: 'module', labelKey: 'home.create.mode.module', icon: IconPuzzle },
]

interface Props {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export default function ViewModeSwitcher({ value, onChange }: Props) {
  const t = useT()
  return (
    <div className="view-mode-switcher" role="tablist" aria-label={t('home.create.mode.aria')}>
      {MODE_IDS.map((m) => {
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
              <ModeIcon size={18} />
            </span>
            <span className="view-mode-label">{t(m.labelKey)}</span>
            {m.badge ? <em className="view-mode-badge">{t('home.create.mode.badge')}</em> : null}
          </button>
        )
      })}
    </div>
  )
}
