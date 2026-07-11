import { useEffect } from 'react'

export interface PageMeta {
  title: string
  description?: string
  ogImage?: string
  ogUrl?: string
}

export function usePageMeta(meta: PageMeta | null) {
  useEffect(() => {
    if (!meta) return
    const prevTitle = document.title
    document.title = meta.title

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.content = content
    }

    if (meta.description) {
      setMeta('name', 'description', meta.description)
      setMeta('property', 'og:description', meta.description)
    }
    setMeta('property', 'og:title', meta.title)
    setMeta('property', 'og:type', 'website')
    if (meta.ogImage) {
      const abs = meta.ogImage.startsWith('http') ? meta.ogImage : `${window.location.origin}${meta.ogImage}`
      setMeta('property', 'og:image', abs)
    }
    if (meta.ogUrl) {
      setMeta('property', 'og:url', meta.ogUrl)
    }

    return () => {
      document.title = prevTitle
    }
  }, [meta?.title, meta?.description, meta?.ogImage, meta?.ogUrl])
}
