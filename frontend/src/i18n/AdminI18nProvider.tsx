import type { ReactNode } from 'react'
import { ShellI18nProvider } from '@blockhub/i18n/react'
import { APP_MESSAGES } from '@shared/i18n/shellBundles'

/** Admin: shell + catalog (same locale store as home/runtime). */
export function AdminI18nProvider({ children }: { children: ReactNode }) {
  return <ShellI18nProvider messages={APP_MESSAGES}>{children}</ShellI18nProvider>
}
