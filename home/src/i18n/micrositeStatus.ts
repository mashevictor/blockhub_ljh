/** Microsite preview status labels — keys in home.json (`home.industry.ms.*`). */

import type { MicrositeLoadState } from '../data/industryMicrositePreviewCache'
import type { TranslateFn } from './industryLabels'

export function msCacheHint(t: TranslateFn, state: boolean | MicrositeLoadState): string {
  if (typeof state === 'boolean') {
    return state ? t('home.industry.ms.hint.cached') : t('home.industry.ms.hint.uncached')
  }
  switch (state) {
    case 'cached':
      return t('home.industry.ms.hint.cached')
    case 'ready':
      return t('home.industry.ms.hint.ready')
    case 'loading':
      return t('home.industry.ms.hint.loading')
    default:
      return t('home.industry.ms.hint.uncached')
  }
}

export function msChipBadge(t: TranslateFn, state: MicrositeLoadState, cssReady = true): string {
  switch (state) {
    case 'cached':
      return cssReady ? t('home.industry.ms.chip.cached') : t('home.industry.ms.chip.caching')
    case 'ready':
      return t('home.industry.ms.chip.ready')
    case 'loading':
      return t('home.industry.ms.chip.loading')
    default:
      return t('home.industry.ms.chip.idle')
  }
}

export function msFrameBadge(
  t: TranslateFn,
  opts: { cached: boolean; busy: boolean; sessionLoaded: boolean },
): string {
  if (opts.cached) return t('home.industry.ms.badge.cached')
  if (opts.busy) return t('home.industry.ms.badge.busy')
  if (opts.sessionLoaded) return t('home.industry.ms.badge.loaded')
  return t('home.industry.ms.badge.live')
}
