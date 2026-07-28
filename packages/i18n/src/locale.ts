/** Locale persistence — no React / no message catalogs. */
import type { Locale } from './types'

export const LOCALE_STORAGE_KEY = 'blockhub_locale'

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'zh-CN' || value === 'en-US'
}

export function readStoredLocale(fallback: Locale = 'zh-CN'): Locale {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(raw)) return raw
  } catch {
    /* private mode */
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
    return 'en-US'
  }
  return fallback
}

export function writeStoredLocale(locale: Locale): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale === 'en-US' ? 'en' : 'zh-CN'
  }
}
