/**
 * Runtime / Home 入口皮肤 SSOT（home 与 runtime-web 均 re-export 本文件）
 * industry_site：独立站模板 → 结构布局 + 色板；capship_workbench：弹幕/模块默认壳
 */

/** 20 套模板对应的结构布局（切换模板 = 重排，不只换色） */
export type MicrositeLayoutMode =
  | 'fullscreen' // Helios / Big Picture：全屏标题 + 底部入口
  | 'sidebar' // Hyperspace / Editorial：左侧导航
  | 'topstrip' // Photon：顶部分区图标条
  | 'bento' // Tessellate：块面拼贴
  | 'feature' // Fractal：主焦点 + 侧列表
  | 'magazine' // Massively：杂志栅格
  | 'centered' // Stellar / Read Only：居中纵轴
  | 'split' // Paradigm / Forty：非对称分栏
  | 'rows' // Solid State / Landed：稳重列表行
  | 'waterfall' // Sonar / Multiverse：瀑布/矩阵
  | 'cinema' // Nova / Dimension：电影感叠层
  | 'story' // Story / Spectral：长滚动叙事

export type MicrositeNavMode = 'left' | 'top' | 'bottom' | 'none'

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
  shellClass: string
  layout: MicrositeLayoutMode
  nav: MicrositeNavMode
}

const SKINS: Record<string, MicrositeRuntimeSkin> = {
  'law-firm': {
    id: 'law-firm', style: 'helios', styleLabel: 'Helios · 全屏开场',
    accent: '#1e3a5f', pageBg: '#0b1220', surface: '#142033', headerBg: '#0b1220', headerFg: '#e8eef7',
    radius: '4px', shellClass: 'skin-helios', layout: 'fullscreen', nav: 'bottom',
  },
  accounting: {
    id: 'accounting', style: 'landed', styleLabel: 'Landed · 稳重商务',
    accent: '#0f766e', pageBg: '#f4f7f5', surface: '#ffffff', headerBg: '#ffffff', headerFg: '#134e4a',
    radius: '10px', shellClass: 'skin-landed', layout: 'rows', nav: 'top',
  },
  consulting: {
    id: 'consulting', style: 'readonly', styleLabel: 'Read Only · 黑金名片',
    accent: '#d4af37', pageBg: '#0a0908', surface: '#141210', headerBg: '#0a0908', headerFg: '#fef9e7',
    radius: '2px', shellClass: 'skin-readonly', layout: 'centered', nav: 'none',
  },
  clinic: {
    id: 'clinic', style: 'tessellate', styleLabel: 'Tessellate · 块面拼贴',
    accent: '#0891b2', pageBg: '#ecfeff', surface: '#ffffff', headerBg: '#ffffff', headerFg: '#155e75',
    radius: '14px', shellClass: 'skin-tessellate', layout: 'bento', nav: 'top',
  },
  dental: {
    id: 'dental', style: 'fractal', styleLabel: 'Fractal · 产品焦点',
    accent: '#2563eb', pageBg: '#eff6ff', surface: '#ffffff', headerBg: '#1d4ed8', headerFg: '#eff6ff',
    radius: '16px', shellClass: 'skin-fractal', layout: 'feature', nav: 'left',
  },
  wellness: {
    id: 'wellness', style: 'photon', styleLabel: 'Photon · 分区图标条',
    accent: '#059669', pageBg: '#f0fdf4', surface: '#ffffff', headerBg: '#ecfdf5', headerFg: '#065f46',
    radius: '18px', shellClass: 'skin-photon', layout: 'topstrip', nav: 'top',
  },
  education: {
    id: 'education', style: 'massively', styleLabel: 'Massively · 杂志栅格',
    accent: '#1d4ed8', pageBg: '#f1f5f9', surface: '#ffffff', headerBg: '#1e3a8a', headerFg: '#e2e8f0',
    radius: '8px', shellClass: 'skin-massively', layout: 'magazine', nav: 'top',
  },
  training: {
    id: 'training', style: 'editorial', styleLabel: 'Editorial · 侧栏杂志',
    accent: '#7c3aed', pageBg: '#faf5ff', surface: '#ffffff', headerBg: '#ffffff', headerFg: '#4c1d95',
    radius: '6px', shellClass: 'skin-editorial', layout: 'sidebar', nav: 'left',
  },
  'study-abroad': {
    id: 'study-abroad', style: 'stellar', styleLabel: 'Stellar · 居中纵轴',
    accent: '#0ea5e9', pageBg: '#f0f9ff', surface: '#ffffff', headerBg: '#ffffff', headerFg: '#0c4a6e',
    radius: '999px', shellClass: 'skin-stellar', layout: 'centered', nav: 'none',
  },
  restaurant: {
    id: 'restaurant', style: 'bigpicture', styleLabel: 'Big Picture · 全幅影像',
    accent: '#b45309', pageBg: '#1c1917', surface: '#292524', headerBg: '#1c1917', headerFg: '#fafaf9',
    radius: '0px', shellClass: 'skin-bigpicture', layout: 'fullscreen', nav: 'bottom',
  },
  hotel: {
    id: 'hotel', style: 'story', styleLabel: 'Story · 叙事长滚动',
    accent: '#a16207', pageBg: '#faf8f5', surface: '#ffffff', headerBg: '#ffffff', headerFg: '#422006',
    radius: '12px', shellClass: 'skin-story', layout: 'story', nav: 'top',
  },
  'real-estate': {
    id: 'real-estate', style: 'forty', styleLabel: 'Forty · 大字标题',
    accent: '#0f766e', pageBg: '#f0fdfa', surface: '#ffffff', headerBg: '#134e4a', headerFg: '#ccfbf1',
    radius: '4px', shellClass: 'skin-forty', layout: 'split', nav: 'top',
  },
  interior: {
    id: 'interior', style: 'paradigm', styleLabel: 'Paradigm · 黑金编辑',
    accent: '#d4af37', pageBg: '#0a0908', surface: '#141210', headerBg: '#0a0908', headerFg: '#fef9e7',
    radius: '0px', shellClass: 'skin-paradigm', layout: 'split', nav: 'left',
  },
  saas: {
    id: 'saas', style: 'hyperspace', styleLabel: 'Hyperspace · 侧栏导航',
    accent: '#4f46e5', pageBg: '#eef2ff', surface: '#ffffff', headerBg: '#312e81', headerFg: '#e0e7ff',
    radius: '12px', shellClass: 'skin-hyperspace', layout: 'sidebar', nav: 'left',
  },
  hardware: {
    id: 'hardware', style: 'nova', styleLabel: 'Nova · 电影感科技',
    accent: '#06b6d4', pageBg: '#020617', surface: '#0f172a', headerBg: '#020617', headerFg: '#e2e8f0',
    radius: '8px', shellClass: 'skin-nova', layout: 'cinema', nav: 'top',
  },
  manufacturing: {
    id: 'manufacturing', style: 'solidstate', styleLabel: 'Solid State · 深色企业',
    accent: '#f59e0b', pageBg: '#111827', surface: '#1f2937', headerBg: '#111827', headerFg: '#f3f4f6',
    radius: '2px', shellClass: 'skin-solidstate', layout: 'rows', nav: 'left',
  },
  beauty: {
    id: 'beauty', style: 'spectral', styleLabel: 'Spectral · 渐变首屏',
    accent: '#db2777', pageBg: '#fdf2f8', surface: '#ffffff', headerBg: '#fce7f3', headerFg: '#9d174d',
    radius: '20px', shellClass: 'skin-spectral', layout: 'story', nav: 'top',
  },
  fitness: {
    id: 'fitness', style: 'dimension', styleLabel: 'Dimension · 遮罩面板',
    accent: '#ea580c', pageBg: '#1c1917', surface: '#292524', headerBg: '#1c1917', headerFg: '#ffedd5',
    radius: '10px', shellClass: 'skin-dimension', layout: 'cinema', nav: 'bottom',
  },
  pet: {
    id: 'pet', style: 'multiverse', styleLabel: 'Multiverse · 图库矩阵',
    accent: '#16a34a', pageBg: '#f7fee7', surface: '#ffffff', headerBg: '#ffffff', headerFg: '#14532d',
    radius: '16px', shellClass: 'skin-multiverse', layout: 'waterfall', nav: 'top',
  },
  photography: {
    id: 'photography', style: 'sonar', styleLabel: 'Sonar · 黑金瀑布流',
    accent: '#d4af37', pageBg: '#0a0908', surface: '#141210', headerBg: '#0a0908', headerFg: '#fef9e7',
    radius: '0px', shellClass: 'skin-sonar', layout: 'waterfall', nav: 'none',
  },
}

export function listMicrositeRuntimeSkins(): MicrositeRuntimeSkin[] {
  return Object.values(SKINS)
}

export function getMicrositeRuntimeSkin(micrositeId: string | null | undefined): MicrositeRuntimeSkin | null {
  if (!micrositeId) return null
  return SKINS[micrositeId] ?? null
}

export function isIndustrySiteEntry(meta: Record<string, unknown> | null | undefined): boolean {
  const entry = String(meta?.entry_source || meta?.entry || '')
  const source = String(meta?.publish_source || '')
  if (entry === 'industry_site') return true
  if (['industry', 'industry_pack', 'industry_site', 'microsite'].includes(source)) return true
  return Boolean(meta?.microsite_id)
}
