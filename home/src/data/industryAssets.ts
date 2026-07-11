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
