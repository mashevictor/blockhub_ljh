import { THEME_STORAGE_KEY } from './brand'

export interface ThemeTokens {
  id: string
  name: string
  tagline: string
  mode: 'light' | 'dark'
  pri: string
  priLight: string
  priDark: string
  priSoft: string
  sec: string
  secLight: string
  accent: string
  bg: string
  surface: string
  surfaceAlt: string
  text: string
  muted: string
  border: string
  ok: string
  heroFrom: string
  heroMid: string
  heroTo: string
  orb1: string
  orb2: string
  orb3: string
  btnFrom: string
  btnTo: string
  btnShine: string
  glass: string
}

/** 四套全站配色（Home 5173 + Admin 5174 同步）· 默认黑白商务 */
export const THEMES: ThemeTokens[] = [
  {
    id: 'monochrome-business',
    name: '白金商务',
    tagline: '炫白 · 琥珀金 · 科技商务',
    mode: 'light',
    pri: '#b8860b',
    priLight: '#d4af37',
    priDark: '#96700a',
    priSoft: '#fef9e7',
    sec: '#1e3a5f',
    secLight: '#334155',
    accent: '#fbbf24',
    bg: '#faf9f7',
    surface: '#ffffff',
    surfaceAlt: '#fffdf8',
    text: '#1c1917',
    muted: '#78716c',
    border: '#e8dfc0',
    ok: '#16a34a',
    heroFrom: '#0a1628',
    heroMid: '#1e3a5f',
    heroTo: '#c9a227',
    orb1: '#d4af37',
    orb2: '#fef3c7',
    orb3: '#ffffff',
    btnFrom: '#96700a',
    btnTo: '#d4af37',
    btnShine: 'rgba(255, 251, 235, 0.55)',
    glass: 'rgba(255, 255, 255, 0.88)',
  },
  {
    id: 'sakura-plum',
    name: '樱花暮色',
    tagline: '樱粉 · 暮紫 · 温柔渐变',
    mode: 'light',
    pri: '#db2777',
    priLight: '#ec4899',
    priDark: '#9d174d',
    priSoft: '#fdf2f8',
    sec: '#9333ea',
    secLight: '#a855f7',
    accent: '#f9a8d4',
    bg: '#fdf2f8',
    surface: '#ffffff',
    surfaceAlt: '#fce7f3',
    text: '#3b0518',
    muted: '#6b3d52',
    border: '#e879a9',
    ok: '#10b981',
    heroFrom: '#500724',
    heroMid: '#9d174d',
    heroTo: '#9333ea',
    orb1: '#ec4899',
    orb2: '#a855f7',
    orb3: '#f9a8d4',
    btnFrom: '#db2777',
    btnTo: '#9333ea',
    btnShine: 'rgba(255, 255, 255, 0.35)',
    glass: 'rgba(255, 255, 255, 0.94)',
  },
  {
    id: 'emerald-amber',
    name: '墨绿琥珀',
    tagline: '墨绿 · 琥珀金 · 自然商务',
    mode: 'light',
    pri: '#047857',
    priLight: '#10b981',
    priDark: '#064e3b',
    priSoft: '#ecfdf5',
    sec: '#d97706',
    secLight: '#fbbf24',
    accent: '#34d399',
    bg: '#f0fdf4',
    surface: '#ffffff',
    surfaceAlt: '#ecfdf5',
    text: '#022c22',
    muted: '#3d5c52',
    border: '#5ec49a',
    ok: '#059669',
    heroFrom: '#022c22',
    heroMid: '#065f46',
    heroTo: '#d97706',
    orb1: '#10b981',
    orb2: '#fbbf24',
    orb3: '#6ee7b7',
    btnFrom: '#047857',
    btnTo: '#d97706',
    btnShine: 'rgba(255, 255, 255, 0.32)',
    glass: 'rgba(255, 255, 255, 0.94)',
  },
  {
    id: 'ocean-coral',
    name: '深海珊瑚',
    tagline: '深海蓝 · 珊瑚橙 · 活力对比',
    mode: 'light',
    pri: '#0369a1',
    priLight: '#0ea5e9',
    priDark: '#075985',
    priSoft: '#e0f2fe',
    sec: '#f97316',
    secLight: '#fb923c',
    accent: '#38bdf8',
    bg: '#f0f9ff',
    surface: '#ffffff',
    surfaceAlt: '#e0f2fe',
    text: '#0c1929',
    muted: '#334155',
    border: '#5eb8e8',
    ok: '#14b8a6',
    heroFrom: '#0c1929',
    heroMid: '#0369a1',
    heroTo: '#f97316',
    orb1: '#0ea5e9',
    orb2: '#f97316',
    orb3: '#38bdf8',
    btnFrom: '#0369a1',
    btnTo: '#f97316',
    btnShine: 'rgba(255, 255, 255, 0.3)',
    glass: 'rgba(255, 255, 255, 0.94)',
  },
]

const LEGACY_MAP: Record<string, string> = {
  'trackchat-theme': 'sakura-plum',
  'black-gold': 'monochrome-business',
  'crimson-white': 'ocean-coral',
  'indigo-cyan': 'ocean-coral',
  'violet-blush': 'sakura-plum',
  'carbon-blue': 'monochrome-business',
  'lava-dark': 'ocean-coral',
  'arctic-aurora': 'ocean-coral',
  indigo: 'ocean-coral',
  aurora: 'ocean-coral',
  violet: 'sakura-plum',
  emerald: 'emerald-amber',
  rose: 'sakura-plum',
  gold: 'emerald-amber',
  ocean: 'ocean-coral',
  sunset: 'ocean-coral',
  slate: 'monochrome-business',
  cosmic: 'ocean-coral',
}

export function applyTheme(theme: ThemeTokens) {
  const r = document.documentElement
  const vars: Record<string, string> = {
    '--pri': theme.pri,
    '--pri-light': theme.priLight,
    '--pri-dark': theme.priDark,
    '--pri-soft': theme.priSoft,
    '--sec': theme.sec,
    '--sec-light': theme.secLight,
    '--accent': theme.accent,
    '--bg': theme.bg,
    '--surface': theme.surface,
    '--surface-alt': theme.surfaceAlt,
    '--text': theme.text,
    '--muted': theme.muted,
    '--border': theme.border,
    '--ok': theme.ok,
    '--hero-from': theme.heroFrom,
    '--hero-mid': theme.heroMid,
    '--hero-to': theme.heroTo,
    '--orb-1': theme.orb1,
    '--orb-2': theme.orb2,
    '--orb-3': theme.orb3,
    '--btn-from': theme.btnFrom,
    '--btn-to': theme.btnTo,
    '--btn-shine': theme.btnShine,
    '--glass': theme.glass,
    '--muted-strong': `color-mix(in srgb, ${theme.text} 55%, ${theme.muted})`,
    '--border-strong': `color-mix(in srgb, ${theme.pri} 38%, ${theme.border})`,
    '--shadow-glow': theme.pri,
    '--shadow-sec': theme.sec,
    '--shadow': `0 4px 24px color-mix(in srgb, ${theme.text} 10%, transparent)`,
    '--shadow-lg': `0 20px 50px color-mix(in srgb, ${theme.pri} 18%, transparent)`,
    '--grad-brand': `linear-gradient(135deg, ${theme.btnFrom}, ${theme.btnTo})`,
    '--grad-hero': `linear-gradient(135deg, ${theme.heroFrom} 0%, ${theme.heroMid} 42%, ${theme.heroTo} 100%)`,
    '--grad-card-edge': `linear-gradient(135deg, ${theme.pri}, ${theme.sec})`,
    '--grad-soft': `linear-gradient(135deg, color-mix(in srgb, ${theme.pri} 16%, ${theme.surface}), color-mix(in srgb, ${theme.sec} 12%, ${theme.surface}))`,
    /* Admin 5174 专用变量 */
    '--sidebar': theme.heroFrom,
    '--sidebar-gradient': `linear-gradient(180deg, ${theme.heroFrom} 0%, ${theme.heroMid} 55%, ${theme.heroTo} 100%)`,
    '--card': theme.surface,
    '--hero-gradient': `linear-gradient(135deg, ${theme.heroFrom} 0%, ${theme.heroMid} 40%, ${theme.pri} 70%, ${theme.priLight} 100%)`,
  }
  for (const [k, v] of Object.entries(vars)) {
    r.style.setProperty(k, v)
  }
  if (theme.id === 'monochrome-business') {
    r.style.setProperty('--grad-hero', `linear-gradient(145deg, ${theme.heroFrom} 0%, ${theme.heroMid} 42%, #2a4a6b 72%, ${theme.heroTo} 100%)`)
    r.style.setProperty('--grad-brand', `linear-gradient(145deg, ${theme.btnFrom} 0%, ${theme.priLight} 55%, ${theme.btnTo} 100%)`)
    r.style.setProperty('--shadow', '0 4px 20px rgba(184, 134, 11, 0.1)')
    r.style.setProperty('--shadow-lg', '0 20px 50px rgba(184, 134, 11, 0.14), 0 8px 24px rgba(10, 22, 40, 0.08)')
    r.style.setProperty('--sidebar-gradient', `linear-gradient(180deg, ${theme.heroFrom} 0%, ${theme.heroMid} 50%, #2a4a6b 80%, ${theme.priDark} 100%)`)
    r.style.setProperty('--hero-gradient', `linear-gradient(135deg, ${theme.heroFrom} 0%, ${theme.heroMid} 38%, #2a4a6b 68%, ${theme.priLight} 100%)`)
    r.style.setProperty('--hero-accent', '#fef3c7')
    r.style.setProperty('--border-strong', '#d4af37')
  } else {
    r.style.removeProperty('--hero-accent')
  }
  r.dataset.theme = theme.id
  r.dataset.themeMode = theme.mode
  document.body.style.background = theme.bg
  document.body.style.color = theme.text
  r.classList.add('theme-transition')
  window.setTimeout(() => r.classList.remove('theme-transition'), 520)
}

function readRawThemeId(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem('trackchat-theme')
  } catch {
    return null
  }
}

export function loadSavedTheme(): string {
  try {
    const raw = readRawThemeId() ?? 'monochrome-business'
    const id = LEGACY_MAP[raw] ?? raw
    return THEMES.some((t) => t.id === id) ? id : 'monochrome-business'
  } catch {
    return 'monochrome-business'
  }
}

export function saveTheme(id: string) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
    localStorage.setItem('trackchat-theme', id)
  } catch { /* ignore */ }
}

export function getThemeById(id: string): ThemeTokens | undefined {
  return THEMES.find((t) => t.id === id)
}
