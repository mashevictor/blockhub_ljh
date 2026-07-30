import type { ReactNode } from 'react'
import type { I18nInstance, I18nOptions, Locale, MessageTree } from './index'

export interface I18nProviderProps extends Omit<I18nOptions, 'locale'> {
  children: ReactNode
  locale?: Locale
  persist?: boolean
}

export declare function I18nProvider(props: I18nProviderProps): JSX.Element
export declare function useI18n(): I18nInstance
export declare function useI18nOptional(): I18nInstance | null
export declare function useT(): (
  key: string,
  vars?: Record<string, string | number>,
) => string

export declare function useTf(): (
  key: string,
  fallback: string,
  vars?: Record<string, string | number>,
) => string

export declare function useFormat(): {
  locale: Locale
  date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  dateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  number: (value: number, options?: Intl.NumberFormatOptions) => string
  currency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string
}
export interface LocaleSwitchProps {
  className?: string
  variant?: 'text' | 'chip'
}

export declare function LocaleSwitch(props: LocaleSwitchProps): JSX.Element

export declare function ShellI18nProvider(props: {
  children: ReactNode
  messages: I18nOptions['messages'] | Record<Locale, MessageTree>
}): JSX.Element
