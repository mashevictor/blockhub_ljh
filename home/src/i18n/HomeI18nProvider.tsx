import type { ReactNode } from 'react'
import { ShellI18nProvider } from '@blockhub/i18n/react'
import { APP_MESSAGES } from '@shared/i18n/shellBundles'

/** Home: shell common.* + catalog cap/hero.* (P3). */
export function HomeI18nProvider({ children }: { children: ReactNode }) {
  return <ShellI18nProvider messages={APP_MESSAGES}>{children}</ShellI18nProvider>
}
