import { flattenMessages, interpolate } from './flatten'
import type { FlatMessages, I18nInstance, I18nOptions, Locale, MessageTree } from './types'

function withPrefix(flat: FlatMessages, prefix?: string): FlatMessages {
  if (!prefix) return flat
  const out: FlatMessages = {}
  const p = prefix.endsWith('.') ? prefix : `${prefix}.`
  for (const [k, v] of Object.entries(flat)) {
    out[k.startsWith(p) ? k : `${p}${k}`] = v
  }
  return out
}

/**
 * Pure i18n runtime — no knowledge of capability / hero / API.
 * Apps and capability packages only call `t` / `registerMessages`.
 */
export function createI18n(options: I18nOptions): I18nInstance {
  let locale: Locale = options.locale
  const fallbackLocale: Locale = options.fallbackLocale ?? 'zh-CN'
  const store: Partial<Record<Locale, FlatMessages>> = {}

  for (const [lang, tree] of Object.entries(options.messages) as [Locale, MessageTree | FlatMessages][]) {
    store[lang] = flattenMessages(tree)
  }

  const lookup = (key: string, lang: Locale): string | undefined => store[lang]?.[key]

  const api: I18nInstance = {
    get locale() {
      return locale
    },
    get fallbackLocale() {
      return fallbackLocale
    },
    t(key, vars) {
      let text = lookup(key, locale)
      if (text === undefined && locale !== fallbackLocale) {
        text = lookup(key, fallbackLocale)
      }
      if (text === undefined) {
        options.onMissingKey?.(key, locale)
        return key
      }
      return interpolate(text, vars)
    },
    setLocale(next) {
      locale = next
    },
    registerMessages(lang, messages, namespacePrefix) {
      const flat = withPrefix(flattenMessages(messages), namespacePrefix)
      store[lang] = { ...(store[lang] ?? {}), ...flat }
    },
    has(key) {
      return lookup(key, locale) !== undefined || lookup(key, fallbackLocale) !== undefined
    },
    getMessages(lang) {
      return { ...(store[lang ?? locale] ?? {}) }
    },
  }

  return api
}
