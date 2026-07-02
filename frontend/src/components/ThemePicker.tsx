import { useState } from 'react'
import { THEMES, applyTheme, loadSavedTheme, saveTheme } from '../data/themes'

export default function ThemePicker() {
  const [activeId, setActiveId] = useState(loadSavedTheme)

  const pick = (id: string) => {
    const theme = THEMES.find((t) => t.id === id)
    if (!theme) return
    setActiveId(id)
    saveTheme(id)
    applyTheme(theme)
  }

  return (
    <div className="admin-theme-picker" role="group" aria-label="全站配色方案">
      <span className="admin-theme-label">全站配色</span>
      {THEMES.map((t) => {
        const on = activeId === t.id
        return (
          <button
            key={t.id}
            type="button"
            className={`admin-theme-btn${on ? ' on' : ''}`}
            onClick={() => pick(t.id)}
            title={`${t.name} — ${t.tagline}`}
            aria-pressed={on}
          >
            <span
              className="admin-theme-swatch"
              style={{ background: `linear-gradient(135deg, ${t.pri}, ${t.sec})` }}
            />
            <span>{t.name}</span>
          </button>
        )
      })}
    </div>
  )
}
