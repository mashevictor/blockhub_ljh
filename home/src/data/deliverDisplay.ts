import type { PublishResult } from './constants'

export type DeliverMode = 'web' | 'app' | 'both'

export function normalizeDeliver(value?: string): DeliverMode {
  if (value === 'web' || value === 'app' || value === 'both') return value
  return 'both'
}

export function deliverLabel(mode: DeliverMode): string {
  if (mode === 'web') return '网页版'
  if (mode === 'app') return 'Android App'
  return '网页 + App 双端'
}

export function showWebDeliver(result: Pick<PublishResult, 'deliver'>): boolean {
  const mode = normalizeDeliver(result.deliver)
  return mode === 'web' || mode === 'both'
}

export function showAppDeliver(result: Pick<PublishResult, 'deliver'>): boolean {
  const mode = normalizeDeliver(result.deliver)
  return mode === 'app' || mode === 'both'
}
