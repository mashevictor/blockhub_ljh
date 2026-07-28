/** Supported UI locales for CapShip / BlockHub. */
export type Locale = 'zh-CN' | 'en-US'

export type MessageTree = { [key: string]: string | MessageTree }

export type FlatMessages = Record<string, string>

export interface I18nOptions {
  locale: Locale
  /** Fallback when key missing in active locale (default zh-CN). */
  fallbackLocale?: Locale
  /** Nested or flat message maps keyed by locale. */
  messages: Partial<Record<Locale, MessageTree | FlatMessages>>
  /** Called once per missing key (dev / telemetry). */
  onMissingKey?: (key: string, locale: Locale) => void
}

export interface I18nInstance {
  locale: Locale
  fallbackLocale: Locale
  t: (key: string, vars?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
  /** Merge / replace messages for a locale (lazy capability packs). */
  registerMessages: (locale: Locale, messages: MessageTree | FlatMessages, namespacePrefix?: string) => void
  has: (key: string) => boolean
  getMessages: (locale?: Locale) => FlatMessages
}
