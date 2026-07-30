import { useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { THEMES, applyTheme, loadSavedTheme, saveTheme } from '../data/themes'

export default function ThemePicker() {
  const t = useT()
  const [activeId, setActiveId] = useState(loadSavedTheme)

  const pick = (id: string) => {
    const theme = THEMES.find((item) => item.id === id)
    if (!theme) return
    setActiveId(id)
    saveTheme(id)
    applyTheme(theme)
  }

  return (
    <div className="admin-theme-picker" role="group" aria-label={t('admin.theme.aria')}>
      <span className="admin-theme-label">{t('admin.theme.label')}</span>
      {THEMES.map((theme) => {
        const on = activeId === theme.id
        return (
          <button
            key={theme.id}
            type="button"
            className={`admin-theme-btn${on ? ' on' : ''}`}
            onClick={() => pick(theme.id)}
            title={`${theme.name} — ${theme.tagline}`}
            aria-pressed={on}
          >
            <span
              className="admin-theme-swatch"
              style={{ background: `linear-gradient(135deg, ${theme.pri}, ${theme.sec})` }}
            />
            <span className="admin-theme-name">{theme.name}</span>
          </button>
        )
      })}
    </div>
  )
}
