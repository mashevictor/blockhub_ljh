/** 案例 / 信任 / 新闻等 enrichment 子页共用内容块 */

export type EnrichLinkItem = { label: string; href: string; external?: boolean }

export type EnrichBlock =
  | { type: 'p'; text: string }
  | { type: 'image'; src: string; alt: string; caption?: string }
  | { type: 'links'; title?: string; items: EnrichLinkItem[] }
  | { type: 'panel'; title: string; lead?: string; paragraphs: string[] }

export interface EnrichSection {
  heading: string
  paragraphs: string[]
}

export function sectionsToBlocks(
  sections: EnrichSection[],
  opts?: {
    relatedLinks?: EnrichLinkItem[]
    relatedTitle?: string
    heroImage?: { src: string; alt: string; caption?: string }
  },
): EnrichBlock[] {
  const blocks: EnrichBlock[] = []
  if (opts?.heroImage) {
    blocks.push({ type: 'image', ...opts.heroImage })
  }
  for (const sec of sections) {
    blocks.push({
      type: 'panel',
      title: sec.heading,
      paragraphs: sec.paragraphs,
    })
  }
  if (opts?.relatedLinks?.length) {
    blocks.push({
      type: 'links',
      title: opts.relatedTitle ?? '延伸阅读',
      items: opts.relatedLinks,
    })
  }
  return blocks
}
