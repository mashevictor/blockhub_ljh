import { THEME_STORAGE_KEY } from './brand'

/** 每套主题的 UI 装饰令牌（按钮、卡片、魔方边框、英雄区等） */
export interface ThemeDecor {
  bodyBg: string
  headerBg: string
  headerBorder: string
  headerShadow: string
  brandMarkRing: string
  orbOpacity: string
  cardBorder: string
  cardShadow: string
  cardShadowHover: string
  scenarioPickOnBg: string
  scenarioPickOnRing: string
  scenarioPickHoverBorder: string
  cubeBorder: string
  cubeBorderSoft: string
  cubeShadow: string
  cubeAccentStrip: string
  btnText: string
  btnShadow: string
  btnInset: string
  warehouseBorder: string
  warehouseShadow: string
  viewModeActiveBg: string
  viewModeActiveShadow: string
  heroAccent: string
  heroCmdColor: string
  heroCmdGlow: string
  danmakuFrameBg: string
  danmakuFrameBorder: string
  danmakuItemBg: string
  danmakuItemBorder: string
  danmakuItemHoverBg: string
  danmakuItemHoverBorder: string
  plazaPanelBg: string
  plazaPanelBorder: string
}

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
  warn: string
  fail: string
  info: string
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
  decor: ThemeDecor
}

const MONO_DECOR: ThemeDecor = {
  bodyBg:
    'radial-gradient(ellipse 90% 55% at 50% -8%, rgba(212,175,55,0.12), transparent), radial-gradient(ellipse 45% 40% at 0% 55%, rgba(254,243,199,0.35), transparent), radial-gradient(ellipse 40% 35% at 100% 75%, rgba(255,253,248,0.8), transparent), var(--bg)',
  headerBg: 'rgba(255,255,255,0.88)',
  headerBorder: 'rgba(212,175,55,0.35)',
  headerShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(184,134,11,0.08)',
  brandMarkRing: '0 0 0 1px rgba(212,175,55,0.45), 0 4px 20px rgba(184,134,11,0.18)',
  orbOpacity: '0.42',
  cardBorder: 'rgba(232,223,192,0.9)',
  cardShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(184,134,11,0.08)',
  cardShadowHover: '0 1px 0 rgba(255,255,255,0.98) inset, 0 12px 32px rgba(184,134,11,0.12)',
  scenarioPickOnBg: 'linear-gradient(145deg, #fffdf8 0%, #fef9e7 100%)',
  scenarioPickOnRing: '0 0 0 2px rgba(184,134,11,0.25), 0 8px 28px rgba(184,134,11,0.12)',
  scenarioPickHoverBorder: '#d4af37',
  cubeBorder: 'rgba(150,112,10,0.55)',
  cubeBorderSoft: 'rgba(184,134,11,0.28)',
  cubeShadow: '0 10px 28px rgba(150,112,10,0.14)',
  cubeAccentStrip: 'linear-gradient(90deg, #96700a 33.33%, #d4af37 33.33%, #d4af37 66.66%, #fef3c7 66.66%)',
  btnText: '#fffdf8',
  btnShadow: '0 4px 18px rgba(184,134,11,0.35)',
  btnInset: 'inset 0 1px 0 rgba(255,251,235,0.35)',
  warehouseBorder: 'rgba(212,175,55,0.25)',
  warehouseShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 48px rgba(184,134,11,0.1)',
  viewModeActiveBg: 'linear-gradient(145deg, #fff 0%, #fef9e7 100%)',
  viewModeActiveShadow: '0 2px 8px rgba(184,134,11,0.12)',
  heroAccent: '#fef3c7',
  heroCmdColor: '#fef3c7',
  heroCmdGlow: '0 0 28px rgba(251,191,36,0.85), 0 0 56px rgba(212,175,55,0.45), 0 2px 12px rgba(0,0,0,0.35)',
  danmakuFrameBg: 'linear-gradient(165deg, rgba(10,22,40,0.82) 0%, rgba(30,58,95,0.65) 100%)',
  danmakuFrameBorder: 'rgba(212,175,55,0.35)',
  danmakuItemBg: 'rgba(254,243,199,0.08)',
  danmakuItemBorder: 'rgba(212,175,55,0.22)',
  danmakuItemHoverBg: 'rgba(254,243,199,0.16)',
  danmakuItemHoverBorder: 'rgba(251,191,36,0.45)',
  plazaPanelBg: 'var(--surface)',
  plazaPanelBorder: 'var(--border)',
}

const SAKURA_DECOR: ThemeDecor = {
  bodyBg:
    'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(236,72,153,0.1), transparent), radial-gradient(ellipse 40% 35% at 100% 60%, rgba(249,168,212,0.25), transparent), var(--bg)',
  headerBg: 'rgba(255,255,255,0.9)',
  headerBorder: 'rgba(232,121,169,0.35)',
  headerShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(219,39,119,0.08)',
  brandMarkRing: '0 0 0 1px rgba(236,72,153,0.4), 0 4px 20px rgba(219,39,119,0.15)',
  orbOpacity: '0.38',
  cardBorder: 'rgba(232,121,169,0.45)',
  cardShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(219,39,119,0.08)',
  cardShadowHover: '0 1px 0 rgba(255,255,255,0.98) inset, 0 12px 32px rgba(219,39,119,0.12)',
  scenarioPickOnBg: 'linear-gradient(145deg, #fff 0%, #fdf2f8 100%)',
  scenarioPickOnRing: '0 0 0 2px rgba(219,39,119,0.22), 0 8px 28px rgba(219,39,119,0.1)',
  scenarioPickHoverBorder: '#ec4899',
  cubeBorder: 'rgba(157,23,77,0.4)',
  cubeBorderSoft: 'rgba(236,72,153,0.28)',
  cubeShadow: '0 10px 28px rgba(157,23,77,0.12)',
  cubeAccentStrip: 'linear-gradient(90deg, #9d174d 33.33%, #ec4899 33.33%, #f9a8d4 66.66%, #fce7f3 66.66%)',
  btnText: '#fff',
  btnShadow: '0 4px 18px rgba(219,39,119,0.32)',
  btnInset: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  warehouseBorder: 'rgba(236,72,153,0.28)',
  warehouseShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 48px rgba(219,39,119,0.08)',
  viewModeActiveBg: 'linear-gradient(145deg, #fff 0%, #fdf2f8 100%)',
  viewModeActiveShadow: '0 2px 8px rgba(219,39,119,0.1)',
  heroAccent: '#fce7f3',
  heroCmdColor: '#fbcfe8',
  heroCmdGlow: '0 0 28px rgba(236,72,153,0.7), 0 0 48px rgba(147,51,234,0.35)',
  danmakuFrameBg: 'linear-gradient(165deg, rgba(80,7,36,0.82) 0%, rgba(157,23,77,0.55) 100%)',
  danmakuFrameBorder: 'rgba(236,72,153,0.35)',
  danmakuItemBg: 'rgba(252,231,243,0.1)',
  danmakuItemBorder: 'rgba(236,72,153,0.22)',
  danmakuItemHoverBg: 'rgba(252,231,243,0.18)',
  danmakuItemHoverBorder: 'rgba(236,72,153,0.45)',
  plazaPanelBg: 'var(--surface)',
  plazaPanelBorder: 'var(--border)',
}

const EMERALD_DECOR: ThemeDecor = {
  bodyBg:
    'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(16,185,129,0.1), transparent), radial-gradient(ellipse 40% 35% at 0% 70%, rgba(251,191,36,0.15), transparent), var(--bg)',
  headerBg: 'rgba(255,255,255,0.9)',
  headerBorder: 'rgba(94,196,154,0.4)',
  headerShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(4,120,87,0.08)',
  brandMarkRing: '0 0 0 1px rgba(16,185,129,0.4), 0 4px 20px rgba(4,120,87,0.15)',
  orbOpacity: '0.36',
  cardBorder: 'rgba(94,196,154,0.45)',
  cardShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(4,120,87,0.08)',
  cardShadowHover: '0 1px 0 rgba(255,255,255,0.98) inset, 0 12px 32px rgba(4,120,87,0.12)',
  scenarioPickOnBg: 'linear-gradient(145deg, #fff 0%, #ecfdf5 100%)',
  scenarioPickOnRing: '0 0 0 2px rgba(4,120,87,0.22), 0 8px 28px rgba(4,120,87,0.1)',
  scenarioPickHoverBorder: '#10b981',
  cubeBorder: 'rgba(6,78,59,0.42)',
  cubeBorderSoft: 'rgba(16,185,129,0.28)',
  cubeShadow: '0 10px 28px rgba(6,78,59,0.12)',
  cubeAccentStrip: 'linear-gradient(90deg, #064e3b 33.33%, #10b981 33.33%, #fbbf24 66.66%, #ecfdf5 66.66%)',
  btnText: '#fff',
  btnShadow: '0 4px 18px rgba(4,120,87,0.32)',
  btnInset: 'inset 0 1px 0 rgba(255,255,255,0.28)',
  warehouseBorder: 'rgba(16,185,129,0.28)',
  warehouseShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 48px rgba(4,120,87,0.08)',
  viewModeActiveBg: 'linear-gradient(145deg, #fff 0%, #ecfdf5 100%)',
  viewModeActiveShadow: '0 2px 8px rgba(4,120,87,0.1)',
  heroAccent: '#d1fae5',
  heroCmdColor: '#a7f3d0',
  heroCmdGlow: '0 0 28px rgba(16,185,129,0.65), 0 0 48px rgba(217,119,6,0.3)',
  danmakuFrameBg: 'linear-gradient(165deg, rgba(2,44,34,0.85) 0%, rgba(6,95,70,0.6) 100%)',
  danmakuFrameBorder: 'rgba(16,185,129,0.35)',
  danmakuItemBg: 'rgba(209,250,229,0.1)',
  danmakuItemBorder: 'rgba(16,185,129,0.22)',
  danmakuItemHoverBg: 'rgba(209,250,229,0.18)',
  danmakuItemHoverBorder: 'rgba(16,185,129,0.45)',
  plazaPanelBg: 'var(--surface)',
  plazaPanelBorder: 'var(--border)',
}

const OCEAN_DECOR: ThemeDecor = {
  bodyBg:
    'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(14,165,233,0.1), transparent), radial-gradient(ellipse 40% 35% at 100% 65%, rgba(249,115,22,0.12), transparent), var(--bg)',
  headerBg: 'rgba(255,255,255,0.9)',
  headerBorder: 'rgba(94,184,232,0.4)',
  headerShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(3,105,161,0.08)',
  brandMarkRing: '0 0 0 1px rgba(14,165,233,0.4), 0 4px 20px rgba(3,105,161,0.15)',
  orbOpacity: '0.38',
  cardBorder: 'rgba(94,184,232,0.45)',
  cardShadow: '0 1px 0 rgba(255,255,255,0.98) inset, 0 4px 24px rgba(3,105,161,0.08)',
  cardShadowHover: '0 1px 0 rgba(255,255,255,0.98) inset, 0 12px 32px rgba(3,105,161,0.12)',
  scenarioPickOnBg: 'linear-gradient(145deg, #fff 0%, #e0f2fe 100%)',
  scenarioPickOnRing: '0 0 0 2px rgba(3,105,161,0.22), 0 8px 28px rgba(3,105,161,0.1)',
  scenarioPickHoverBorder: '#0ea5e9',
  cubeBorder: 'rgba(7,89,133,0.42)',
  cubeBorderSoft: 'rgba(14,165,233,0.28)',
  cubeShadow: '0 10px 28px rgba(7,89,133,0.12)',
  cubeAccentStrip: 'linear-gradient(90deg, #075985 33.33%, #0ea5e9 33.33%, #f97316 66.66%, #e0f2fe 66.66%)',
  btnText: '#fff',
  btnShadow: '0 4px 18px rgba(3,105,161,0.32)',
  btnInset: 'inset 0 1px 0 rgba(255,255,255,0.28)',
  warehouseBorder: 'rgba(14,165,233,0.28)',
  warehouseShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 48px rgba(3,105,161,0.08)',
  viewModeActiveBg: 'linear-gradient(145deg, #fff 0%, #e0f2fe 100%)',
  viewModeActiveShadow: '0 2px 8px rgba(3,105,161,0.1)',
  heroAccent: '#bae6fd',
  heroCmdColor: '#7dd3fc',
  heroCmdGlow: '0 0 28px rgba(14,165,233,0.7), 0 0 48px rgba(249,115,22,0.3)',
  danmakuFrameBg: 'linear-gradient(165deg, rgba(12,25,41,0.85) 0%, rgba(3,105,161,0.55) 100%)',
  danmakuFrameBorder: 'rgba(14,165,233,0.35)',
  danmakuItemBg: 'rgba(224,242,254,0.1)',
  danmakuItemBorder: 'rgba(14,165,233,0.22)',
  danmakuItemHoverBg: 'rgba(224,242,254,0.18)',
  danmakuItemHoverBorder: 'rgba(14,165,233,0.45)',
  plazaPanelBg: 'var(--surface)',
  plazaPanelBorder: 'var(--border)',
}

/** 四套全站配色 · 默认白金商务（黑金） */
export const THEMES: ThemeTokens[] = [
  {
    id: 'monochrome-business',
    name: '白金商务',
    tagline: '黑金 · 琥珀金 · 科技商务',
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
    warn: '#d97706',
    fail: '#ef4444',
    info: '#0284c7',
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
    decor: MONO_DECOR,
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
    warn: '#f59e0b',
    fail: '#ef4444',
    info: '#0284c7',
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
    decor: SAKURA_DECOR,
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
    warn: '#f59e0b',
    fail: '#ef4444',
    info: '#0284c7',
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
    decor: EMERALD_DECOR,
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
    warn: '#f59e0b',
    fail: '#ef4444',
    info: '#0284c7',
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
    decor: OCEAN_DECOR,
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

function decorVars(d: ThemeDecor): Record<string, string> {
  return {
    '--theme-body-bg': d.bodyBg,
    '--theme-header-bg': d.headerBg,
    '--theme-header-border': d.headerBorder,
    '--theme-header-shadow': d.headerShadow,
    '--theme-brand-ring': d.brandMarkRing,
    '--theme-orb-opacity': d.orbOpacity,
    '--theme-card-border': d.cardBorder,
    '--theme-card-shadow': d.cardShadow,
    '--theme-card-shadow-hover': d.cardShadowHover,
    '--theme-scenario-on-bg': d.scenarioPickOnBg,
    '--theme-scenario-on-ring': d.scenarioPickOnRing,
    '--theme-scenario-hover-border': d.scenarioPickHoverBorder,
    '--cube-border': d.cubeBorder,
    '--cube-border-soft': d.cubeBorderSoft,
    '--cube-shadow': d.cubeShadow,
    '--cube-radius': '14px',
    '--theme-cube-accent-strip': d.cubeAccentStrip,
    '--btn-text': d.btnText,
    '--btn-shadow': d.btnShadow,
    '--btn-inset': d.btnInset,
    '--theme-warehouse-border': d.warehouseBorder,
    '--theme-warehouse-shadow': d.warehouseShadow,
    '--theme-viewmode-active-bg': d.viewModeActiveBg,
    '--theme-viewmode-active-shadow': d.viewModeActiveShadow,
    '--hero-accent': d.heroAccent,
    '--theme-hero-cmd-color': d.heroCmdColor,
    '--theme-hero-cmd-glow': d.heroCmdGlow,
    '--theme-danmaku-frame-bg': d.danmakuFrameBg,
    '--theme-danmaku-frame-border': d.danmakuFrameBorder,
    '--theme-danmaku-item-bg': d.danmakuItemBg,
    '--theme-danmaku-item-border': d.danmakuItemBorder,
    '--theme-danmaku-item-hover-bg': d.danmakuItemHoverBg,
    '--theme-danmaku-item-hover-border': d.danmakuItemHoverBorder,
    '--theme-plaza-panel-bg': d.plazaPanelBg,
    '--theme-plaza-panel-border': d.plazaPanelBorder,
  }
}

export function applyTheme(theme: ThemeTokens) {
  const r = document.documentElement
  const d = theme.decor
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
    '--warn': theme.warn,
    '--fail': theme.fail,
    '--info': theme.info,
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
    '--border-strong': theme.id === 'monochrome-business' ? theme.priLight : `color-mix(in srgb, ${theme.pri} 38%, ${theme.border})`,
    '--shadow-glow': theme.pri,
    '--shadow-sec': theme.sec,
    '--shadow': `0 4px 20px color-mix(in srgb, ${theme.pri} 10%, transparent)`,
    '--shadow-lg': `0 20px 50px color-mix(in srgb, ${theme.pri} 14%, transparent), 0 8px 24px color-mix(in srgb, ${theme.text} 6%, transparent)`,
    '--grad-brand': `linear-gradient(145deg, ${theme.btnFrom} 0%, ${theme.priLight} 55%, ${theme.btnTo} 100%)`,
    '--grad-hero': `linear-gradient(145deg, ${theme.heroFrom} 0%, ${theme.heroMid} 42%, color-mix(in srgb, ${theme.heroMid} 70%, ${theme.heroTo}) 72%, ${theme.heroTo} 100%)`,
    '--grad-card-edge': `linear-gradient(135deg, ${theme.pri}, ${theme.sec})`,
    '--grad-soft': `linear-gradient(135deg, color-mix(in srgb, ${theme.pri} 12%, ${theme.surface}), color-mix(in srgb, ${theme.sec} 8%, ${theme.surface}))`,
    '--sidebar': theme.heroFrom,
    '--sidebar-gradient': `linear-gradient(180deg, ${theme.heroFrom} 0%, ${theme.heroMid} 55%, ${theme.heroTo} 100%)`,
    '--card': theme.surface,
    '--hero-gradient': `linear-gradient(135deg, ${theme.heroFrom} 0%, ${theme.heroMid} 40%, ${theme.pri} 70%, ${theme.priLight} 100%)`,
    ...decorVars(d),
  }
  for (const [k, v] of Object.entries(vars)) {
    r.style.setProperty(k, v)
  }
  r.dataset.theme = theme.id
  r.dataset.themeMode = theme.mode
  document.body.style.background = d.bodyBg
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

export type { ThemeDecor as ThemeDecorTokens }
