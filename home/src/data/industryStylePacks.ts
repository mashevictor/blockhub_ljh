/**
 * 12 套行业独立站「效果样式包」— 整页视觉略有差异（非统一模板微调）
 * 20 行业映射到 12 套；每套含独立 hero 结构 + 面板/场景/CTA 形态
 *
 * 导航栏 SSOT：与首页白底毛玻璃一致，行业差异仅体现在 --site-primary（顶栏 accent + 激活 pill）
 * 见 industry-style-packs.css 末尾 `.industry-site .industry-site-header` 统一块
 */

export type IndustryStylePack =
  | 'classic'      /* 01 居中商务蓝 */
  | 'industrial'   /* 02 深色工业钢 */
  | 'velocity'     /* 03 斜切高能红 */
  | 'serenity'     /* 04 医疗柔和绿 */
  | 'cyber'        /* 05 霓虹暗紫 */
  | 'market'       /* 06 零售暖橙卡片 */
  | 'campus'       /* 07 学院条纹蓝 */
  | 'vault'        /* 08 金融深蓝金 */
  | 'freight'      /* 09 物流琥珀路线 */
  | 'horizon'      /* 10 地产分栏大图 */
  | 'people'       /* 11 人资紫色 bento */
  | 'broadcast'    /* 12 传媒洋红波段 */

export type IndustryHeroVariant =
  | 'centered'
  | 'split-left'
  | 'split-right'
  | 'stacked-dark'
  | 'soft-card'
  | 'minimal-bar'

export interface StylePackMeta {
  id: IndustryStylePack
  label: string
  heroVariant: IndustryHeroVariant
  /** 页面底色倾向 */
  pageBg: string
  /** 面板形态 */
  panelShape: 'rounded' | 'sharp' | 'pill' | 'dashed' | 'glass' | 'flat'
}

export const STYLE_PACK_META: Record<IndustryStylePack, StylePackMeta> = {
  classic: { id: 'classic', label: '经典商务', heroVariant: 'centered', pageBg: '#f4f7fb', panelShape: 'rounded' },
  industrial: { id: 'industrial', label: '工业钢铁', heroVariant: 'split-left', pageBg: '#0f1419', panelShape: 'sharp' },
  velocity: { id: 'velocity', label: '增长斜切', heroVariant: 'stacked-dark', pageBg: '#1a0a0a', panelShape: 'sharp' },
  serenity: { id: 'serenity', label: '清新医疗', heroVariant: 'soft-card', pageBg: '#f0fdf4', panelShape: 'pill' },
  cyber: { id: 'cyber', label: '赛博霓虹', heroVariant: 'stacked-dark', pageBg: '#0c0a14', panelShape: 'glass' },
  market: { id: 'market', label: '商超暖色', heroVariant: 'soft-card', pageBg: '#fff7ed', panelShape: 'rounded' },
  campus: { id: 'campus', label: '学院蓝条', heroVariant: 'centered', pageBg: '#eff6ff', panelShape: 'rounded' },
  vault: { id: 'vault', label: '金融金库', heroVariant: 'split-left', pageBg: '#0c1929', panelShape: 'flat' },
  freight: { id: 'freight', label: '物流干线', heroVariant: 'minimal-bar', pageBg: '#fffbeb', panelShape: 'dashed' },
  horizon: { id: 'horizon', label: '地平线分栏', heroVariant: 'split-right', pageBg: '#fafaf9', panelShape: 'rounded' },
  people: { id: 'people', label: '人力 bento', heroVariant: 'soft-card', pageBg: '#faf5ff', panelShape: 'pill' },
  broadcast: { id: 'broadcast', label: '传媒波段', heroVariant: 'stacked-dark', pageBg: '#1a0a1a', panelShape: 'glass' },
}

/** 20 行业 → 12 套效果样式包（壳层视觉）；真实落地页另见 industryMicrositeTemplates */
export const INDUSTRY_STYLE_PACK: Record<string, IndustryStylePack> = {
  office: 'classic',
  gov: 'vault',
  mfg: 'industrial',
  construction: 'freight',
  sales: 'velocity',
  marketing: 'market',
  med: 'serenity',
  hotel: 'horizon',
  game: 'cyber',
  retail: 'market',
  agriculture: 'campus',
  edu: 'campus',
  finance: 'vault',
  legal: 'vault',
  logistics: 'freight',
  auto: 'velocity',
  realestate: 'horizon',
  energy: 'industrial',
  hr: 'people',
  media: 'broadcast',
}

export function getIndustryStylePack(key: string): IndustryStylePack {
  return INDUSTRY_STYLE_PACK[key] ?? 'classic'
}

export function getStylePackMeta(pack: IndustryStylePack): StylePackMeta {
  return STYLE_PACK_META[pack]
}

export function industrySitePackClass(key: string): string {
  const pack = getIndustryStylePack(key)
  return `industry-site--pack-${pack}`
}
