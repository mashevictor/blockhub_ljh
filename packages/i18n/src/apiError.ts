/**
 * Resolve FastAPI `detail` for UI: prefer t('error.' + code), else message/string.
 */

export type ApiErrorDetail =
  | string
  | {
      code?: string
      params?: Record<string, string | number>
      message?: string
    }
  | Array<{ msg?: string; message?: string }>

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export function formatApiErrorDetail(
  detail: unknown,
  t: TranslateFn | undefined,
  fallback: string,
): string {
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim()
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          return item.msg || item.message || ''
        }
        return ''
      })
      .filter(Boolean)
    if (parts.length) return parts.join('; ')
    return fallback
  }
  if (detail && typeof detail === 'object') {
    const d = detail as {
      code?: string
      params?: Record<string, string | number>
      message?: string
    }
    if (d.code && t) {
      const key = d.code.startsWith('error.') ? d.code : `error.${d.code}`
      const text = t(key, d.params)
      if (text && text !== key) return text
    }
    if (typeof d.message === 'string' && d.message.trim()) {
      return d.message.trim()
    }
  }
  return fallback
}

/** Axios / fetch-style error with response.data.detail */
export function formatAxiosApiError(
  error: unknown,
  t: TranslateFn | undefined,
  fallback: string,
): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as { response?: { data?: { detail?: unknown }; status?: number } }
    ).response
    const detail = response?.data?.detail
    const status = response?.status
    if (status === 405 || (typeof detail === 'string' && /method not allowed/i.test(detail))) {
      return fallback
    }
    const resolved = formatApiErrorDetail(detail, t, '')
    if (resolved) return resolved
    if (status === 502 || status === 503) {
      if (t) {
        const key = status === 502 ? 'error.BAD_GATEWAY' : 'error.SERVICE_UNAVAILABLE'
        const text = t(key)
        if (text !== key) return text
      }
    }
  }
  if (error instanceof Error && error.message) {
    return `${fallback}: ${error.message}`
  }
  return fallback
}
