/** Publish / generate UI labels — keys in home.json (`home.publish.*`). */

import { BLOCKHUB_DEMO_APP_NAME, INDUSTRY_DEFAULT_APP_NAMES } from '../data/appBranding'
import type { TranslateFn } from './industryLabels'

export function publishGenerateLabel(t: TranslateFn): string {
  return t('home.publish.generate')
}

export function publishGenerateLoading(t: TranslateFn): string {
  return t('home.publish.generate_loading')
}

export function publishBookLabel(t: TranslateFn): string {
  return t('home.publish.book')
}

export function publishBookLoading(t: TranslateFn): string {
  return t('home.publish.book_loading')
}

export function publishErrorFallback(t: TranslateFn): string {
  return t('home.publish.error_fallback')
}

/** Resolved default app name for an industry pack; falls back to SSOT Chinese map. */
export function defaultAppNameI18n(t: TranslateFn, industryKey: string): string {
  const key = `home.publish.app.${industryKey}`
  const v = t(key)
  return v === key
    ? INDUSTRY_DEFAULT_APP_NAMES[industryKey] || t('home.publish.app_fallback')
    : v
}

/** BlockHub demo page default name (office industry). */
export function blockhubDemoAppNameI18n(t: TranslateFn): string {
  const v = defaultAppNameI18n(t, 'office')
  return v || BLOCKHUB_DEMO_APP_NAME
}
