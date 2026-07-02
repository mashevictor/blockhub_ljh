import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEMES, applyTheme, loadSavedTheme, saveTheme, type ThemeTokens } from '../data/themes'

interface ThemeContextValue {
  theme: ThemeTokens
  setThemeId: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeTokens>(() => {
    const saved = loadSavedTheme()
    return THEMES.find((t) => t.id === saved) ?? THEMES[0]
  })

  const setThemeId = useCallback((id: string) => {
    const next = THEMES.find((t) => t.id === id)
    if (!next) return
    setTheme(next)
    applyTheme(next)
    saveTheme(id)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setThemeId }), [theme, setThemeId])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export { THEMES }
