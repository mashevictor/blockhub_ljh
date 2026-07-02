import { useEffect } from 'react'

/** 模态层打开时锁定页面滚动，避免 sticky 输入区与对话框叠层冲突 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.classList.add('modal-scroll-lock')
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.classList.remove('modal-scroll-lock')
      document.body.style.overflow = prev
    }
  }, [active])
}
