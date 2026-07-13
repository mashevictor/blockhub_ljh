import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** 路由切换时回到页面顶部（避免从首页点行业后落在底部） */
export default function ScrollToTop() {
  const { pathname, key } = useLocation()

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, key])

  return null
}
