import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { createI18n } from './createI18n'
import { getContributedMessages, subscribeI18nContributions } from './contribute'
import { flattenMessages } from './flatten'
import { readStoredLocale, writeStoredLocale } from './locale'
import type { FlatMessages, I18nInstance, I18nOptions, Locale, MessageTree } from './types'
import { formatCurrency, formatDate, formatDateTime, formatNumber } from './format'

const I18nContext = createContext<I18nInstance | null>(null)

function mergeLocaleMaps(
  base: MessageTree | FlatMessages | undefined,
  contrib: FlatMessages | undefined,
): FlatMessages {
  return { ...flattenMessages(base ?? {}), ...(contrib ?? {}) }
}

export interface I18nProviderProps extends Omit<I18nOptions, 'locale'> {
  children: ReactNode
  locale?: Locale
  /** Persist locale to localStorage + document.documentElement.lang */
  persist?: boolean
}

/** Thin React bridge — optional peer; core stays react-free via `createI18n`. */
export function I18nProvider({
  children,
  locale: initialLocale,
  fallbackLocale,
  messages,
  onMissingKey,
  persist = true,
}: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(
    () => initialLocale ?? (persist ? readStoredLocale('zh-CN') : 'zh-CN'),
  )
  const [contribTick, setContribTick] = useState(0)

  useEffect(() => subscribeI18nContributions(() => setContribTick((n) => n + 1)), [])

  useEffect(() => {
    if (persist) writeStoredLocale(locale)
    else if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'en-US' ? 'en' : 'zh-CN'
    }
  }, [locale, persist])

  const i18n = useMemo(() => {
    const contrib = getContributedMessages()
    const inst = createI18n({
      locale,
      fallbackLocale,
      messages: {
        'zh-CN': mergeLocaleMaps(messages?.['zh-CN'], contrib['zh-CN']),
        'en-US': mergeLocaleMaps(messages?.['en-US'], contrib['en-US']),
      },
      onMissingKey,
    })
    inst.setLocale = (next: Locale) => {
      setLocale(next)
    }
    return inst
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contribTick refreshes lazy package locales
  }, [locale, fallbackLocale, messages, onMissingKey, contribTick])

  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nInstance {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n() requires <I18nProvider>')
  }
  return ctx
}

/** Safe for web-core widgets that may render outside a provider. */
export function useI18nOptional(): I18nInstance | null {
  return useContext(I18nContext)
}

export function useT() {
  const i18n = useI18n()
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => i18n.t(key, vars),
    [i18n],
  )
}

/**
 * Translate with ZH fallback — for capability widgets (works without Provider).
 * If key missing, returns fallback (not the raw key).
 */
export function useTf() {
  const i18n = useI18nOptional()
  return useCallback(
    (key: string, fallback: string, vars?: Record<string, string | number>) => {
      if (!i18n) return fallback
      const text = i18n.t(key, vars)
      return text === key ? fallback : text
    },
    [i18n],
  )
}

/** Date/number formatters bound to the active i18n locale (P6). */
export function useFormat() {
  const i18n = useI18nOptional()
  const locale: Locale = i18n?.locale ?? 'zh-CN'
  return useMemo(
    () => ({
      locale,
      date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
        formatDate(value, locale, options),
      dateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
        formatDateTime(value, locale, options),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, locale, options),
      currency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) =>
        formatCurrency(value, locale, currency, options),
    }),
    [locale],
  )
}

export interface LocaleSwitchProps {
  className?: string
}

/** Compact ZH | EN control for shell headers. */
export function LocaleSwitch({ className }: LocaleSwitchProps) {
  const i18n = useI18n()
  const other: Locale = i18n.locale === 'zh-CN' ? 'en-US' : 'zh-CN'
  const label = i18n.locale === 'zh-CN' ? 'EN' : '中文'
  return (
    <button
      type="button"
      className={className}
      aria-label={i18n.locale === 'zh-CN' ? 'Switch to English' : '切换到中文'}
      onClick={() => i18n.setLocale(other)}
    >
      {label}
    </button>
  )
}

/** Convenience wrapper: persist + app/shell messages. */
export function ShellI18nProvider({
  children,
  messages,
}: {
  children: ReactNode
  messages: I18nOptions['messages']
}) {
  return (
    <I18nProvider messages={messages as Partial<Record<Locale, MessageTree>>} persist>
      {children}
    </I18nProvider>
  )
}
