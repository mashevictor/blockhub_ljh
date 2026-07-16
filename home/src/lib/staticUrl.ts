/**
 * 静态资源 URL：同源或可选 CDN（构建时 VITE_STATIC_CDN_BASE）。
 * 例：VITE_STATIC_CDN_BASE=https://cdn.blockhub.club
 */
const CDN = String(import.meta.env.VITE_STATIC_CDN_BASE || '')
  .trim()
  .replace(/\/+$/, '')

export function staticUrl(path: string): string {
  if (!path) return path
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return CDN ? `${CDN}${normalized}` : normalized
}

export function staticCdnBase(): string {
  return CDN
}
