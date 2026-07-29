import type { PublishResult } from './constants'

export type DeliverMode = 'web' | 'app' | 'both'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export function normalizeDeliver(value?: string): DeliverMode {
  if (value === 'web' || value === 'app' || value === 'both') return value
  return 'both'
}

export function deliverLabel(mode: DeliverMode, t?: TranslateFn): string {
  if (t) {
    if (mode === 'web') return t('home.deliver_mode.web')
    if (mode === 'app') return t('home.deliver_mode.app')
    return t('home.deliver_mode.both')
  }
  if (mode === 'web') return '网页版'
  if (mode === 'app') return 'App 版'
  return '五端发布'
}

export function showWebDeliver(result: Pick<PublishResult, 'deliver'>): boolean {
  const mode = normalizeDeliver(result.deliver)
  return mode === 'web' || mode === 'both'
}

export function showAppDeliver(result: Pick<PublishResult, 'deliver'>): boolean {
  const mode = normalizeDeliver(result.deliver)
  return mode === 'app' || mode === 'both'
}
