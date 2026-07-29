/** Locale-aware public download paths under /downloads. */

function isPdfPath(path: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(path)
}

/**
 * zh keeps `/downloads/foo.pdf`.
 * en (and other non-zh) → `/downloads/foo.en-US.pdf` (same folder; avoids nested-path deploy misses).
 */
export function localizeDownloadPath(path: string, locale: string): string {
  if (!path.startsWith('/downloads/') || !isPdfPath(path)) {
    return path
  }
  // Already localized
  if (/\.en-US\.pdf(?:$|[?#])/i.test(path) || path.includes('/downloads/en-US/')) {
    if (locale.startsWith('zh')) {
      // Switch back to zh root file
      return path
        .replace('/downloads/en-US/', '/downloads/')
        .replace(/\.en-US\.pdf/i, '.pdf')
    }
    // Prefer flat sibling name over nested folder
    if (path.includes('/downloads/en-US/')) {
      const name = path.split('/').pop() || ''
      return `/downloads/${name.replace(/\.pdf$/i, '.en-US.pdf')}`
    }
    return path
  }
  if (locale.startsWith('zh')) return path
  return path.replace(/\.pdf$/i, '.en-US.pdf')
}

/** Rewrite markdown/HTML links to PDFs for the active locale. */
export function localizePdfLinksInText(text: string, locale: string): string {
  if (locale.startsWith('zh')) {
    return text
      .replace(/\/downloads\/en-US\//g, '/downloads/')
      .replace(/\.en-US\.pdf/gi, '.pdf')
  }
  return text.replace(/\/downloads\/(?!en-US\/)([^)\s"'<>]+)\.pdf/gi, (_m, name: string) => {
    if (/\.en-US$/i.test(name)) return `/downloads/${name}.pdf`
    return `/downloads/${name}.en-US.pdf`
  })
}
