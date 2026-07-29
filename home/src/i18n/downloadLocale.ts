/** Locale-aware public download paths under /downloads. */

/** zh keeps root PDFs; en-US (and other non-zh) use /downloads/en-US/*.pdf */
export function localizeDownloadPath(path: string, locale: string): string {
  if (!path.startsWith('/downloads/') || !/\.pdf(?:$|[?#])/i.test(path)) {
    return path
  }
  if (locale.startsWith('zh')) return path
  if (path.startsWith('/downloads/en-US/')) return path
  return path.replace('/downloads/', '/downloads/en-US/')
}

/** Rewrite markdown/HTML links to PDFs for the active locale. */
export function localizePdfLinksInText(text: string, locale: string): string {
  if (locale.startsWith('zh')) return text
  return text.replace(/\/downloads\/(?!en-US\/)([^)\s"'<>]+\.pdf)/gi, '/downloads/en-US/$1')
}
