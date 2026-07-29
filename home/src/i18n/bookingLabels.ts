/** Booking field / validation copy from home.json (`home.booking.*`). */

import {
  BOOKING_FIELDS,
  isEmailOk,
  isPhoneOk,
  type BookingFieldDef,
} from '../data/demoBookingFlow'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

function fieldText(
  t: TranslateFn,
  key: BookingFieldDef['key'],
  suffix: 'label' | 'hint' | 'prompt' | 'chev' | 'placeholder' | 'ghost',
  fallback: string,
): string {
  const full = `home.booking.field.${key}.${suffix}`
  const text = t(full)
  return text === full ? fallback : text
}

export function localizeBookingField(t: TranslateFn, field: BookingFieldDef): BookingFieldDef {
  return {
    ...field,
    label: fieldText(t, field.key, 'label', field.label),
    hint: fieldText(t, field.key, 'hint', field.hint),
    prompt: fieldText(t, field.key, 'prompt', field.prompt),
    chevLabel: fieldText(t, field.key, 'chev', field.chevLabel),
    placeholder: fieldText(t, field.key, 'placeholder', field.placeholder),
    ghost: fieldText(t, field.key, 'ghost', field.ghost),
  }
}

export function localizedBookingFields(t: TranslateFn): BookingFieldDef[] {
  return BOOKING_FIELDS.map((f) => localizeBookingField(t, f))
}

export function validateBookingFieldLocalized(
  t: TranslateFn,
  field: BookingFieldDef,
  raw: string,
): string | null {
  const localized = localizeBookingField(t, field)
  const v = raw.trim()
  if (field.key === 'contact') {
    if (!v) return t('home.booking.err.contact_required')
    if (v.includes('@') && !isEmailOk(v)) return t('home.booking.err.email')
    if (!v.includes('@') && !isPhoneOk(v)) return t('home.booking.err.phone')
    return null
  }
  if (field.required && !v) {
    return t('home.booking.err.required', { label: localized.label })
  }
  return null
}

export function bookingListJoin(t: TranslateFn, labels: string[]): string {
  const joiner = t('home.cap_split.joiner')
  return labels.join(joiner === 'home.cap_split.joiner' ? '、' : joiner)
}
