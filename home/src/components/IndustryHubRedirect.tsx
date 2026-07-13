import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../routes/paths'

/** /industry 汇总页已下线 → 回首页行业方案区 */
export default function IndustryHubRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`${ROUTES.home}#product`, { replace: true })
  }, [navigate])

  return null
}
