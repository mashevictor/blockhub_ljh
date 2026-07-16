import { Navigate, useParams } from 'react-router-dom'
import { ROUTES } from '../routes/paths'

/** 旧预览 URL → 真 Runtime（与发布后 /r/{appId} 同构，挂真 widget + 真 API） */
export default function IndustryRuntimePreviewPage() {
  const { pack = 'mfg' } = useParams()
  const qs = typeof window !== 'undefined' ? window.location.search : ''
  return <Navigate to={`${ROUTES.industryRuntimePack(pack)}${qs}`} replace />
}
