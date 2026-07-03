export interface AppBrandingInput {
  appName: string
  iconUrl: string
  primaryColor: string
}

export const DEFAULT_PRIMARY_COLOR = '#4338ca'

export function emptyBranding(appName = ''): AppBrandingInput {
  return { appName, iconUrl: '', primaryColor: DEFAULT_PRIMARY_COLOR }
}

export function resolveAppName(custom: string, fallback: string): string {
  const trimmed = custom.trim()
  return trimmed || fallback
}
