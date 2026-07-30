/** Date / number formatting bound to active Locale (P6). */

import type { Locale } from './types'

export type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  if (value instanceof Date) return value
  return new Date(value)
}

export function formatDate(
  value: DateInput,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'medium' }).format(d)
}

export function formatDateTime(
  value: DateInput,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(
    d,
  )
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return String(value)
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatCurrency(
  value: number,
  locale: Locale,
  currency = locale === 'en-US' ? 'USD' : 'CNY',
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumber(value, locale, {
    style: 'currency',
    currency,
    ...options,
  })
}
