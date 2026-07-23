import { staticUrl } from '../lib/staticUrl'

/** 20 行业深度包配图（与 home/public/industry 及 manifest.json 一致） */
export interface IndustryAssetSet {
  hero: string
  thumb: string
  og: string
}

/** 金融五垂直复用既有 finance 配图，避免 /industry/bank/thumb.jpg 等 404 引发布局抖动 */
const ASSET_ALIAS: Record<string, string> = {
  bank: 'finance',
  securities: 'finance',
  insurance: 'finance',
  fund: 'finance',
  fintech: 'finance',
}

function assetKey(key: string): string {
  return ASSET_ALIAS[key] || key
}

export function industryAssets(key: string): IndustryAssetSet {
  const base = `/industry/${assetKey(key)}`
  return {
    hero: staticUrl(`${base}/hero.jpg`),
    thumb: staticUrl(`${base}/thumb.jpg`),
    og: staticUrl(`${base}/og.png`),
  }
}

/** 首页/列表卡片用小图，避免 hero 宽图裁切错位 */
export function industryCardImage(key: string): string {
  return industryAssets(key).thumb
}
