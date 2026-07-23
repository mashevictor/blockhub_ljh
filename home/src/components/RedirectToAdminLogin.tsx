import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { adminLoginUrlWithReturn } from '../data/brand'

/** Home /login /register → 统一后台登录入口（保留当前意图回跳） */
export default function RedirectToAdminLogin() {
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const from = params.get('from')
    // 注册/登录页本身：回跳默认进管理后台；若带 from 则保留
    const target = from
      ? adminLoginUrlWithReturn(from)
      : adminLoginUrlWithReturn('/')
    window.location.replace(target)
  }, [location.search])

  return (
    <p style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
      正在跳转到统一登录入口（管理后台）…
    </p>
  )
}
