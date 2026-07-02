import { THEMES, useTheme } from '../context/ThemeContext'

export default function ThemePicker() {
  const { theme, setThemeId } = useTheme()

  return (
    <div className="theme-switcher" role="group" aria-label="配色方案">
      {THEMES.map((t) => {
        const active = theme.id === t.id
        return (
          <button
            key={t.id}
            type="button"
            className={`theme-switch${active ? ' on' : ''}`}
            onClick={() => setThemeId(t.id)}
            title={`${t.name} — ${t.tagline}`}
            aria-pressed={active}
          >
            <span
              className="theme-switch-swatch"
              style={{ background: `linear-gradient(135deg, ${t.pri}, ${t.sec})` }}
            />
            <span className="theme-switch-name">{t.name}</span>
          </button>
        )
      })}
    </div>
  )
}
