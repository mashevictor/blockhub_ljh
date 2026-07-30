import type { ReactNode } from 'react'
import { ShellI18nProvider } from '@blockhub/i18n/react'
import { APP_MESSAGES } from '@shared/i18n/shellBundles'

/** Runtime: shell + catalog; capability packages contribute via contributeI18nMessages. */
export function RuntimeI18nProvider({ children }: { children: ReactNode }) {
  return <ShellI18nProvider messages={APP_MESSAGES}>{children}</ShellI18nProvider>
}
