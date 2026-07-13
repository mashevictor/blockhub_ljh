/** 20 行业深度包配图（与 home/public/industry 及 manifest.json 一致） */
export interface IndustryAssetSet {
  hero: string
  thumb: string
  og: string
}

export function industryAssets(key: string): IndustryAssetSet {
  const base = `/industry/${key}`
  return {
    hero: `${base}/hero.jpg`,
    thumb: `${base}/thumb.jpg`,
    og: `${base}/og.png`,
  }
}

/** 首页/列表卡片用小图，避免 hero 宽图裁切错位 */
export function industryCardImage(key: string): string {
  return industryAssets(key).thumb
}
