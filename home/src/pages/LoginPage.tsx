import { useEffect } from 'react'
import { adminLoginUrl } from '../data/brand'

/** Home 登录入口统一跳转到 Admin 管理后台登录 */
export default function LoginPage() {
  useEffect(() => {
    window.location.replace(adminLoginUrl())
  }, [])

  return (
    <div className="login-page">
      <p className="login-hint">正在跳转到管理后台登录…</p>
    </div>
  )
}
