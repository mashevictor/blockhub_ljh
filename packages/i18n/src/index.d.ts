/** Ambient types for apps — tsc should not compile package TSX (no local react install). */
export type Locale = 'zh-CN' | 'en-US'

export type MessageTree = { [key: string]: string | MessageTree }

export type FlatMessages = Record<string, string>

export interface I18nOptions {
  locale: Locale
  fallbackLocale?: Locale
  messages: Partial<Record<Locale, MessageTree | FlatMessages>>
  onMissingKey?: (key: string, locale: Locale) => void
}

export interface I18nInstance {
  readonly locale: Locale
  readonly fallbackLocale: Locale
  t: (key: string, vars?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
  registerMessages: (
    locale: Locale,
    messages: MessageTree | FlatMessages,
    namespacePrefix?: string,
  ) => void
  has: (key: string) => boolean
  getMessages: (locale?: Locale) => FlatMessages
}

export declare function createI18n(options: I18nOptions): I18nInstance
export declare function flattenMessages(input: MessageTree | FlatMessages): FlatMessages
export declare function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string

export type LocaleBundles = Partial<Record<Locale, FlatMessages>>
export declare function mergeMessageTrees(
  ...parts: Array<MessageTree | FlatMessages | undefined | null>
): FlatMessages
export declare function sanitizeCatalog(raw: Record<string, unknown>): FlatMessages

export declare const LOCALE_STORAGE_KEY: string
export declare function isLocale(value: string | null | undefined): value is Locale
export declare function readStoredLocale(fallback?: Locale): Locale
export declare function writeStoredLocale(locale: Locale): void

export declare function contributeI18nMessages(
  chunk: Partial<Record<Locale, MessageTree | FlatMessages>>,
): void
export declare function getContributedMessages(): Partial<Record<Locale, FlatMessages>>
export declare function subscribeI18nContributions(fn: () => void): () => void

export type ApiErrorDetail =
  | string
  | {
      code?: string
      params?: Record<string, string | number>
      message?: string
    }
  | Array<{ msg?: string; message?: string }>

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export declare function formatApiErrorDetail(
  detail: unknown,
  t: TranslateFn | undefined,
  fallback: string,
): string
export declare function formatAxiosApiError(
  error: unknown,
  t: TranslateFn | undefined,
  fallback: string,
): string

export type DateInput = Date | string | number
export declare function formatDate(
  value: DateInput,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string
export declare function formatDateTime(
  value: DateInput,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string
export declare function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string
export declare function formatCurrency(
  value: number,
  locale: Locale,
  currency?: string,
  options?: Intl.NumberFormatOptions,
): string
