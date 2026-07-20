/**
 * 独立站视觉模板 → Runtime 皮肤（设计关联，非整页复刻 HTML）
 *
 * 入口分流 SSOT：
 * - industry_site：独立站 / 行业向导 → Runtime 带 microsite 皮肤
 * - capship_workbench：弹幕 / 选模块 / 描述需求 → 默认 Tabs/侧栏工作台壳
 */

export type RuntimeEntrySource = 'industry_site' | 'capship_workbench'

export interface MicrositeRuntimeSkin {
  id: string
  style: string
  styleLabel: string
  accent: string
  pageBg: string
  surface: string
  headerBg: string
  headerFg: string
  radius: string
  /** CSS class suffix on runtime shell */
  shellClass: string
}

/** 与 industryMicrositeTemplates 20 套 id 对齐 */
export const MICROSITE_RUNTIME_SKINS: Record<string, MicrositeRuntimeSkin> = {
  'law-firm': {
    id: 'law-firm',
    style: 'helios',
    styleLabel: 'Helios · 全屏开场',
    accent: '#1e3a5f',
    pageBg: '#0b1220',
    surface: '#142033',
    headerBg: '#0b1220',
    headerFg: '#e8eef7',
    radius: '4px',
    shellClass: 'skin-helios',
  },
  accounting: {
    id: 'accounting',
    style: 'landed',
    styleLabel: 'Landed · 稳重商务',
    accent: '#0f766e',
    pageBg: '#f4f7f5',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#134e4a',
    radius: '10px',
    shellClass: 'skin-landed',
  },
  consulting: {
    id: 'consulting',
    style: 'readonly',
    styleLabel: 'Read Only · 极简名片',
    accent: '#334155',
    pageBg: '#f8fafc',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#0f172a',
    radius: '2px',
    shellClass: 'skin-readonly',
  },
  clinic: {
    id: 'clinic',
    style: 'tessellate',
    styleLabel: 'Tessellate · 块面拼贴',
    accent: '#0891b2',
    pageBg: '#ecfeff',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#155e75',
    radius: '14px',
    shellClass: 'skin-tessellate',
  },
  dental: {
    id: 'dental',
    style: 'fractal',
    styleLabel: 'Fractal · 产品焦点',
    accent: '#2563eb',
    pageBg: '#eff6ff',
    surface: '#ffffff',
    headerBg: '#1d4ed8',
    headerFg: '#eff6ff',
    radius: '16px',
    shellClass: 'skin-fractal',
  },
  wellness: {
    id: 'wellness',
    style: 'photon',
    styleLabel: 'Photon · 分区图标条',
    accent: '#059669',
    pageBg: '#f0fdf4',
    surface: '#ffffff',
    headerBg: '#ecfdf5',
    headerFg: '#065f46',
    radius: '18px',
    shellClass: 'skin-photon',
  },
  education: {
    id: 'education',
    style: 'massively',
    styleLabel: 'Massively · 杂志栅格',
    accent: '#1d4ed8',
    pageBg: '#f1f5f9',
    surface: '#ffffff',
    headerBg: '#1e3a8a',
    headerFg: '#e2e8f0',
    radius: '8px',
    shellClass: 'skin-massively',
  },
  training: {
    id: 'training',
    style: 'editorial',
    styleLabel: 'Editorial · 侧栏杂志',
    accent: '#7c3aed',
    pageBg: '#faf5ff',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#4c1d95',
    radius: '6px',
    shellClass: 'skin-editorial',
  },
  'study-abroad': {
    id: 'study-abroad',
    style: 'stellar',
    styleLabel: 'Stellar · 居中纵轴',
    accent: '#0ea5e9',
    pageBg: '#f0f9ff',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#0c4a6e',
    radius: '999px',
    shellClass: 'skin-stellar',
  },
  restaurant: {
    id: 'restaurant',
    style: 'bigpicture',
    styleLabel: 'Big Picture · 全幅影像',
    accent: '#b45309',
    pageBg: '#1c1917',
    surface: '#292524',
    headerBg: '#1c1917',
    headerFg: '#fafaf9',
    radius: '0px',
    shellClass: 'skin-bigpicture',
  },
  hotel: {
    id: 'hotel',
    style: 'story',
    styleLabel: 'Story · 叙事长滚动',
    accent: '#a16207',
    pageBg: '#faf8f5',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#422006',
    radius: '12px',
    shellClass: 'skin-story',
  },
  'real-estate': {
    id: 'real-estate',
    style: 'forty',
    styleLabel: 'Forty · 大字标题',
    accent: '#0f766e',
    pageBg: '#f0fdfa',
    surface: '#ffffff',
    headerBg: '#134e4a',
    headerFg: '#ccfbf1',
    radius: '4px',
    shellClass: 'skin-forty',
  },
  interior: {
    id: 'interior',
    style: 'paradigm',
    styleLabel: 'Paradigm · 非对称编辑',
    accent: '#57534e',
    pageBg: '#fafaf9',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#1c1917',
    radius: '0px',
    shellClass: 'skin-paradigm',
  },
  saas: {
    id: 'saas',
    style: 'hyperspace',
    styleLabel: 'Hyperspace · 侧栏导航',
    accent: '#4f46e5',
    pageBg: '#eef2ff',
    surface: '#ffffff',
    headerBg: '#312e81',
    headerFg: '#e0e7ff',
    radius: '12px',
    shellClass: 'skin-hyperspace',
  },
  hardware: {
    id: 'hardware',
    style: 'nova',
    styleLabel: 'Nova · 电影感科技',
    accent: '#06b6d4',
    pageBg: '#020617',
    surface: '#0f172a',
    headerBg: '#020617',
    headerFg: '#e2e8f0',
    radius: '8px',
    shellClass: 'skin-nova',
  },
  manufacturing: {
    id: 'manufacturing',
    style: 'solidstate',
    styleLabel: 'Solid State · 深色企业',
    accent: '#f59e0b',
    pageBg: '#111827',
    surface: '#1f2937',
    headerBg: '#111827',
    headerFg: '#f3f4f6',
    radius: '2px',
    shellClass: 'skin-solidstate',
  },
  beauty: {
    id: 'beauty',
    style: 'spectral',
    styleLabel: 'Spectral · 渐变首屏',
    accent: '#db2777',
    pageBg: '#fdf2f8',
    surface: '#ffffff',
    headerBg: '#fce7f3',
    headerFg: '#9d174d',
    radius: '20px',
    shellClass: 'skin-spectral',
  },
  fitness: {
    id: 'fitness',
    style: 'dimension',
    styleLabel: 'Dimension · 遮罩面板',
    accent: '#ea580c',
    pageBg: '#1c1917',
    surface: '#292524',
    headerBg: '#1c1917',
    headerFg: '#ffedd5',
    radius: '10px',
    shellClass: 'skin-dimension',
  },
  pet: {
    id: 'pet',
    style: 'multiverse',
    styleLabel: 'Multiverse · 图库矩阵',
    accent: '#16a34a',
    pageBg: '#f7fee7',
    surface: '#ffffff',
    headerBg: '#ffffff',
    headerFg: '#14532d',
    radius: '16px',
    shellClass: 'skin-multiverse',
  },
  photography: {
    id: 'photography',
    style: 'sonar',
    styleLabel: 'Sonar · 摄影瀑布流',
    accent: '#525252',
    pageBg: '#fafafa',
    surface: '#ffffff',
    headerBg: '#171717',
    headerFg: '#fafafa',
    radius: '0px',
    shellClass: 'skin-sonar',
  },
}

export function getMicrositeRuntimeSkin(micrositeId: string | null | undefined): MicrositeRuntimeSkin | null {
  if (!micrositeId) return null
  return MICROSITE_RUNTIME_SKINS[micrositeId] ?? null
}

/** 弹幕 / 模块 / 描述需求 → 工作台入口 */
export function isCapShipWorkbenchSource(source: string | null | undefined): boolean {
  const s = (source || '').toLowerCase()
  return ['prompt', 'module', 'modules', 'danmaku', 'hero', 'role', 'capship'].includes(s) || !s
}

/** 独立站 / 行业向导 → 模板皮肤入口 */
export function isIndustrySiteSource(source: string | null | undefined): boolean {
  const s = (source || '').toLowerCase()
  return ['industry', 'industry_pack', 'industry_site', 'microsite'].includes(s)
}
