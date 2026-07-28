/**
 * App message bundles: shell common.* + error.* + catalog cap/hero codegen.
 * Capability widget locales arrive via contributeI18nMessages (lazy packages).
 */
import commonZh from './messages/zh-CN/common.json'
import commonEn from './messages/en-US/common.json'
import homeZh from './messages/zh-CN/home.json'
import homeEn from './messages/en-US/home.json'
import errorsZh from './messages/zh-CN/errors.json'
import errorsEn from './messages/en-US/errors.json'
import capZh from './messages/zh-CN/capability.gen.json'
import capEn from './messages/en-US/capability.gen.json'
import heroZh from './messages/zh-CN/hero.gen.json'
import heroEn from './messages/en-US/hero.gen.json'

function stripMeta(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue
    if (typeof v === 'string') out[k] = v
  }
  return out
}

export const SHELL_MESSAGES = {
  'zh-CN': { common: commonZh, home: homeZh, error: errorsZh },
  'en-US': { common: commonEn, home: homeEn, error: errorsEn },
} as const

/** Shell + errors + capability/hero catalog (P3/P4). */
export const APP_MESSAGES = {
  'zh-CN': {
    common: commonZh,
    home: homeZh,
    error: errorsZh,
    ...stripMeta(capZh as Record<string, unknown>),
    ...stripMeta(heroZh as Record<string, unknown>),
  },
  'en-US': {
    common: commonEn,
    home: homeEn,
    error: errorsEn,
    ...stripMeta(capEn as Record<string, unknown>),
    ...stripMeta(heroEn as Record<string, unknown>),
  },
} as const
