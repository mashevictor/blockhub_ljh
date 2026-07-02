import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../auth/session'
import { getToken } from '../auth/storage'
import { BRAND, LOGO } from '../data/brand'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'
  const [email, setEmail] = useState('admin@trackchat.local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getToken()) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setError('登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <img src={LOGO.mark} alt="" width={40} height={40} />
          <div>
            <h1>{BRAND.nameZh} {BRAND.nameEn}</h1>
            <p>管理后台登录</p>
          </div>
        </div>
        <label>
          邮箱
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? '登录中…' : '登录'}</button>
        <p className="login-hint">演示账号：admin@trackchat.local / admin123</p>
      </form>
    </div>
  )
}
