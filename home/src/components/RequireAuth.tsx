import { useEffect } from 'react'
import { getToken } from '../auth/storage'
import { adminLoginUrlWithReturn } from '../data/brand'

/**
 * Home 需登录页守卫：无 token → Admin 登录并带回当前路径。
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getToken()

  useEffect(() => {
    if (token) return
    const ret = `${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(adminLoginUrlWithReturn(ret || '/'))
  }, [token])

  if (!token) {
    return (
      <p style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        正在跳转登录…
      </p>
    )
  }

  return <>{children}</>
}
