import type { PlazaFeedItem } from '../data/plazaMock'
import { loadStoredPlazaPosts } from './plazaFeedStorage'
import { PLAZA_MOCK_FEED } from '../data/plazaMock'

export type BarrageVariant = 'public' | 'dept' | 'org' | 'gold'

export interface BarrageTag {
  itemId: string
  label: string
  variant: BarrageVariant
  durationSec: number
  delaySec: number
}

export function barrageLabel(item: PlazaFeedItem): string {
  return `${item.atLabel} · ${item.appName} · ${item.authorName}`
}

export function barrageVariant(item: PlazaFeedItem): BarrageVariant {
  if (item.atLabel.includes('老板') || item.atLabel.includes('全员')) return 'gold'
  if (item.visibility === 'dept') return 'dept'
  if (item.visibility === 'org') return 'org'
  return 'public'
}

/** 双轨分配：轨1 = 公开/组织，轨2 = 部门 */
export function splitIntoRails(items: PlazaFeedItem[]): {
  rail1: PlazaFeedItem[]
  rail2: PlazaFeedItem[]
} {
  const rail1: PlazaFeedItem[] = []
  const rail2: PlazaFeedItem[] = []
  for (const item of items) {
    if (item.visibility === 'dept') rail2.push(item)
    else rail1.push(item)
  }
  return { rail1, rail2 }
}

export function buildBarrageTags(items: PlazaFeedItem[], laneIndex: 0 | 1): BarrageTag[] {
  const baseDuration = laneIndex === 0 ? 14 : 18
  return items.map((item, i) => ({
    itemId: item.id,
    label: barrageLabel(item),
    variant: barrageVariant(item),
    durationSec: baseDuration + (i % 3) * 2,
    delaySec: -(i * 3.5),
  }))
}

export interface PlazaDataFlowSnapshot {
  storageKey: string
  userPostCount: number
  mockCount: number
  mergedCount: number
  rail1Count: number
  rail2Count: number
  userPostIds: string[]
  mockIds: string[]
}

export function getPlazaDataFlowSnapshot(items: PlazaFeedItem[]): PlazaDataFlowSnapshot {
  const userPosts = loadStoredPlazaPosts().filter(
    (p) => p.audienceType === 'public' || p.audienceType === 'dept',
  )
  const userIds = new Set(userPosts.map((p) => p.id))
  const mockUsed = PLAZA_MOCK_FEED.filter((m) => !userIds.has(m.id))
  const { rail1, rail2 } = splitIntoRails(items)
  return {
    storageKey: 'blockhub_plaza_feed',
    userPostCount: userPosts.length,
    mockCount: mockUsed.length,
    mergedCount: items.length,
    rail1Count: rail1.length,
    rail2Count: rail2.length,
    userPostIds: userPosts.map((p) => p.id),
    mockIds: mockUsed.map((m) => m.id),
  }
}
