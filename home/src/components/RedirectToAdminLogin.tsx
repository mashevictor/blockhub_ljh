import { useEffect } from 'react'
import { getAdminUrl } from '../data/constants'

/** Home /login /register → 统一后台登录入口 */
export default function RedirectToAdminLogin() {
  useEffect(() => {
    window.location.replace(getAdminUrl())
  }, [])
  return (
    <p style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
      正在跳转到统一登录入口…
    </p>
  )
}
