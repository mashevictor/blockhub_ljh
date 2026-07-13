import type { DeliverMode } from './deliverDisplay'

export type PlatformId = 'web' | 'ios' | 'android' | 'windows' | 'mac'

export const ALL_PLATFORMS: PlatformId[] = ['web', 'ios', 'android', 'windows', 'mac']

/** 「双端」预设：网页 + 移动 App（iOS · Android） */
export const DUAL_PLATFORMS: PlatformId[] = ['web', 'ios', 'android']

export const MOBILE_PLATFORMS: PlatformId[] = ['ios', 'android']

export const DESKTOP_PLATFORMS: PlatformId[] = ['windows', 'mac']

export interface PlatformMeta {
  id: PlatformId
  label: string
  short: string
}

export const PLATFORM_META: PlatformMeta[] = [
  { id: 'web', label: '网页', short: 'Web' },
  { id: 'ios', label: 'iOS', short: 'iOS' },
  { id: 'android', label: 'Android', short: 'And' },
  { id: 'windows', label: 'Windows', short: 'Win' },
  { id: 'mac', label: 'macOS', short: 'Mac' },
]

export interface DeliverPreset {
  id: string
  label: string
  platforms: PlatformId[]
}

export const DELIVER_PRESETS: DeliverPreset[] = [
  { id: 'all5', label: '五端', platforms: ALL_PLATFORMS },
  { id: 'dual', label: '双端', platforms: DUAL_PLATFORMS },
  { id: 'web', label: '网页', platforms: ['web'] },
  { id: 'app', label: 'App', platforms: MOBILE_PLATFORMS },
]

function platformKey(platforms: PlatformId[]): string {
  return [...platforms].sort().join(',')
}

export function platformsMatch(a: PlatformId[], b: PlatformId[]): boolean {
  return platformKey(a) === platformKey(b)
}

export function platformsToDeliver(platforms: PlatformId[]): DeliverMode {
  if (platforms.length === 0) return 'both'
  const hasWeb = platforms.includes('web')
  const hasMobile = platforms.some((p) => p === 'ios' || p === 'android')
  const hasDesktop = platforms.some((p) => p === 'windows' || p === 'mac')
  if (hasWeb && !hasMobile && !hasDesktop) return 'web'
  if (hasMobile && !hasWeb && !hasDesktop) return 'app'
  return 'both'
}

export function deliverToPlatforms(mode: DeliverMode): PlatformId[] {
  if (mode === 'web') return ['web']
  if (mode === 'app') return [...MOBILE_PLATFORMS]
  return [...ALL_PLATFORMS]
}

export interface DeliverChannels {
  web: boolean
  mobile: boolean
  desktop: boolean
}

export function resolveDeliverChannels(platforms: PlatformId[]): DeliverChannels {
  return {
    web: platforms.includes('web'),
    mobile: platforms.some((p) => p === 'ios' || p === 'android'),
    desktop: platforms.some((p) => p === 'windows' || p === 'mac'),
  }
}

export interface PlatformSummary {
  label: string
  /** 预设「双端/网页/App」不显示 x/5，避免与渠道语义冲突 */
  countLabel: string | null
  channels: DeliverChannels
}

export function platformsSummary(platforms: PlatformId[]): PlatformSummary {
  const channels = resolveDeliverChannels(platforms)
  const preset = DELIVER_PRESETS.find((p) => platformsMatch(platforms, p.platforms))

  if (platforms.length === 0) {
    return { label: '五端', countLabel: '5/5', channels: { web: true, mobile: true, desktop: true } }
  }

  if (preset) {
    return {
      label: preset.label,
      countLabel: preset.id === 'all5' ? '5/5' : null,
      channels,
    }
  }

  return {
    label: `${platforms.length}端`,
    countLabel: `${platforms.length}/5`,
    channels,
  }
}
