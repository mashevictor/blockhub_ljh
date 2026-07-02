import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginOtp, loginWithPassword, sendOtpCode } from '../auth/session'
import { getToken } from '../auth/storage'
import { BRAND, DEMO_ACCOUNTS, LOGO } from '../data/brand'

type AuthMode = 'otp' | 'password'

function isValidAccount(v: string) {
  const trimmed = v.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true
  return /^1[3-9]\d{9}$/.test(trimmed.replace(/\s/g, ''))
}

interface Props {
  title?: string
  subtitle?: string
  backLink?: string
  defaultEmail?: string
  defaultPassword?: string
  showPasswordLogin?: boolean
  defaultMode?: AuthMode
  showDemoAccounts?: boolean
}

export default function AuthPage({
  title = `${BRAND.nameZh} ${BRAND.nameEn}`,
  subtitle = '登录或注册',
  backLink,
  defaultEmail = '',
  defaultPassword = '',
  showPasswordLogin = true,
  defaultMode = 'otp',
  showDemoAccounts = false,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'

  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [account, setAccount] = useState('')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  if (getToken()) {
    return <Navigate to={from} replace />
  }

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const canSendCode = useMemo(() => isValidAccount(account) && countdown === 0 && !sending, [account, countdown, sending])
  const canSubmitOtp = useMemo(() => isValidAccount(account) && /^\d{4,8}$/.test(code.trim()), [account, code])

  const handleSendCode = async () => {
    setError('')
    setHint('')
    setSending(true)
    try {
      const res = await sendOtpCode(account.trim())
      setCountdown(60)
      setHint(res.message + (res.debug_code ? `（演示验证码：${res.debug_code}）` : ''))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : '验证码发送失败')
    } finally {
      setSending(false)
    }
  }

  const onSubmitOtp = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await loginOtp(account.trim(), code.trim())
      navigate(from, { replace: true })
    } catch {
      setError('验证码错误或已过期')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitPassword = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await loginWithPassword(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={mode === 'otp' ? onSubmitOtp : onSubmitPassword}>
        <div className="login-brand">
          <img src={LOGO.mark} alt="" width={40} height={40} />
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        {showPasswordLogin && (
          <div className="contact-gate-tabs login-mode-tabs">
            <button type="button" className={mode === 'otp' ? 'on' : ''} onClick={() => setMode('otp')}>
              验证码登录
            </button>
            <button type="button" className={mode === 'password' ? 'on' : ''} onClick={() => setMode('password')}>
              密码登录
            </button>
          </div>
        )}

        {mode === 'otp' ? (
          <>
            <label>
              手机号 / 邮箱
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="13800000000 或 name@company.com"
                required
                autoComplete="username"
              />
            </label>
            <label className="otp-code-row">
              验证码
              <div className="otp-code-inputs">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 位验证码"
                  required
                />
                <button type="button" className="btn-ghost otp-send-btn" disabled={!canSendCode} onClick={handleSendCode}>
                  {sending ? '发送中…' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </label>
            <p className="login-hint">未注册的手机号/邮箱验证后将自动创建账号</p>
          </>
        ) : (
          <>
            <label>
              邮箱
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </label>
            <label>
              密码
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </label>
            {showDemoAccounts && (
              <div className="login-demo-accounts">
                <p className="login-demo-title">演示账号（密码登录）</p>
                <ul>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <li key={acc.email}>
                      <button
                        type="button"
                        className="login-demo-pick"
                        onClick={() => {
                          setEmail(acc.email)
                          setPassword(acc.password)
                          setError('')
                        }}
                      >
                        <strong>{acc.role}</strong>
                        <span>{acc.email}</span>
                        <span>{acc.password}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {error && <p className="login-error">{error}</p>}
        {hint && !error && <p className="login-hint">{hint}</p>}
        <button type="submit" disabled={loading || (mode === 'otp' && !canSubmitOtp)}>
          {loading ? '登录中…' : mode === 'otp' ? '登录 / 注册' : '登录'}
        </button>
        {backLink && (
          <p className="login-hint"><Link to={backLink}>返回首页</Link></p>
        )}
      </form>
    </div>
  )
}
