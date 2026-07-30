import { createI18n, readStoredLocale } from '@blockhub/i18n'
import { APP_MESSAGES } from '@shared/i18n/shellBundles'

export type HomeTranslateFn = (key: string, vars?: Record<string, string | number>) => string

/** Non-React home copy — reads stored locale from @blockhub/i18n. Keys: `home.*`. */
export function homeT(key: string, vars?: Record<string, string | number>): string {
  const i18n = createI18n({
    locale: readStoredLocale(),
    fallbackLocale: 'zh-CN',
    messages: APP_MESSAGES as Parameters<typeof createI18n>[0]['messages'],
  })
  return i18n.t(key, vars)
}

export function homeTr(
  t: HomeTranslateFn | undefined,
  key: string,
  vars?: Record<string, string | number>,
): string {
  return t ? t(key, vars) : homeT(key, vars)
}
