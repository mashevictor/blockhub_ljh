/**
 * App message bundles: shell common.* + error.* + catalog cap/hero/industry/scene codegen.
 * Capability widget locales arrive via contributeI18nMessages (lazy packages).
 * Scene + industry UI copy also ship client-side so industry microsites switch offline / on fallback.
 */
import commonZh from './messages/zh-CN/common.json'
import commonEn from './messages/en-US/common.json'
import homeZh from './messages/zh-CN/home.json'
import homeEn from './messages/en-US/home.json'
import productZh from './messages/zh-CN/product.json'
import productEn from './messages/en-US/product.json'
import adminZh from './messages/zh-CN/admin.json'
import adminEn from './messages/en-US/admin.json'
import runtimeZh from './messages/zh-CN/runtime.json'
import runtimeEn from './messages/en-US/runtime.json'
import contentZh from './messages/zh-CN/content.json'
import contentEn from './messages/en-US/content.json'
import errorsZh from './messages/zh-CN/errors.json'
import errorsEn from './messages/en-US/errors.json'
import capZh from './messages/zh-CN/capability.gen.json'
import capEn from './messages/en-US/capability.gen.json'
import heroZh from './messages/zh-CN/hero.gen.json'
import heroEn from './messages/en-US/hero.gen.json'
import industryZh from './messages/zh-CN/industry.gen.json'
import industryEn from './messages/en-US/industry.gen.json'
import industryUiZh from './messages/zh-CN/industry.ui.gen.json'
import industryUiEn from './messages/en-US/industry.ui.gen.json'
import sceneZh from './messages/zh-CN/scene.gen.json'
import sceneEn from './messages/en-US/scene.gen.json'

function stripMeta(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue
    if (typeof v === 'string') out[k] = v
  }
  return out
}

export const SHELL_MESSAGES = {
  'zh-CN': {
    common: commonZh,
    home: homeZh,
    product: productZh,
    admin: adminZh,
    runtime: runtimeZh,
    content: contentZh,
    error: errorsZh,
  },
  'en-US': {
    common: commonEn,
    home: homeEn,
    product: productEn,
    admin: adminEn,
    runtime: runtimeEn,
    content: contentEn,
    error: errorsEn,
  },
} as const

/** Shell + marketing content + capability/hero/industry/scene catalog. */
export const APP_MESSAGES = {
  'zh-CN': {
    common: commonZh,
    home: homeZh,
    product: productZh,
    admin: adminZh,
    runtime: runtimeZh,
    content: contentZh,
    error: errorsZh,
    ...stripMeta(capZh as Record<string, unknown>),
    ...stripMeta(heroZh as Record<string, unknown>),
    ...stripMeta(industryZh as Record<string, unknown>),
    ...stripMeta(industryUiZh as Record<string, unknown>),
    ...stripMeta(sceneZh as Record<string, unknown>),
  },
  'en-US': {
    common: commonEn,
    home: homeEn,
    product: productEn,
    admin: adminEn,
    runtime: runtimeEn,
    content: contentEn,
    error: errorsEn,
    ...stripMeta(capEn as Record<string, unknown>),
    ...stripMeta(heroEn as Record<string, unknown>),
    ...stripMeta(industryEn as Record<string, unknown>),
    ...stripMeta(industryUiEn as Record<string, unknown>),
    ...stripMeta(sceneEn as Record<string, unknown>),
  },
} as const
