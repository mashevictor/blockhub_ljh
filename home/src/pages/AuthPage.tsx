import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginOtp, loginWithPassword, sendOtpCode } from '../auth/session'
import { getToken } from '../auth/storage'
import { ROUTES } from '../routes/paths'
import { BRAND, DEMO_ACCOUNTS } from '../data/brand'
import BrandMark from '../components/BrandMark'

type AuthMode = 'otp' | 'password'

function isValidAccount(v: string) {
  const trimmed = v.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true
  return /^1[3-9]\d{9}$/.test(trimmed.replace(/\s/g, ''))
}

function authErrorMessage(err: unknown, fallback: string): string {
  const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
  if (!resp) {
    return '无法连接服务。请确认网络正常，或使用演示站 http://101.32.209.251'
  }
  if (resp.status === 429) {
    return typeof resp.data?.detail === 'string' ? resp.data.detail : '发送过于频繁，请稍后再试'
  }
  if (resp.status === 503 || resp.status === 500) {
    return '服务暂不可用，请稍后重试或访问演示站'
  }
  const detail = resp.data?.detail
  return typeof detail === 'string' ? detail : fallback
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
  showLogo?: boolean
}

export default function AuthPage({
  title = `${BRAND.nameZh} ${BRAND.nameEn}`,
  subtitle = '登录或注册',
  backLink = ROUTES.home,
  defaultEmail = '',
  defaultPassword = '',
  showPasswordLogin = true,
  defaultMode = 'otp',
  showDemoAccounts = false,
  showLogo = true,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || ROUTES.home
  const isRegister = location.pathname === '/register'

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

  const hasToken = !!getToken()

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const canSendCode = useMemo(
    () => isValidAccount(account) && countdown === 0 && !sending,
    [account, countdown, sending],
  )
  const canSubmitOtp = useMemo(
    () => isValidAccount(account) && /^\d{6}$/.test(code.trim()),
    [account, code],
  )

  const handleSendCode = async () => {
    if (!isValidAccount(account)) {
      setError('请输入有效邮箱或 11 位手机号')
      return
    }
    setError('')
    setHint('')
    setSending(true)
    try {
      const res = await sendOtpCode(account.trim())
      setCountdown(60)
      const debug = res.debug_code ? `（演示验证码：${res.debug_code}）` : ''
      setHint(`${res.message}${debug}`)
    } catch (err: unknown) {
      setError(authErrorMessage(err, '验证码发送失败'))
    } finally {
      setSending(false)
    }
  }

  const onSubmitOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmitOtp) {
      setError('请填写手机号/邮箱和 6 位验证码')
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginOtp(account.trim(), code.trim())
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(authErrorMessage(err, '验证码错误或已过期'))
    } finally {
      setLoading(false)
    }
  }

  const onSubmitPassword = async (e: FormEvent) => {
    e.preventDefault()
    await loginWithCredentials(email, password)
  }

  const loginWithCredentials = async (demoEmail: string, demoPassword: string) => {
    setLoading(true)
    setError('')
    try {
      await loginWithPassword(demoEmail, demoPassword)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(authErrorMessage(err, '登录失败，请检查邮箱和密码'))
    } finally {
      setLoading(false)
    }
  }

  const onDemoLogin = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setMode('password')
    setEmail(acc.email)
    setPassword(acc.password)
    void loginWithCredentials(acc.email, acc.password)
  }

  if (hasToken) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={mode === 'otp' ? onSubmitOtp : onSubmitPassword}>
        <div className="login-brand">
          {showLogo && <BrandMark size={40} />}
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        {showPasswordLogin && (
          <div className="login-mode-tabs">
            <button type="button" className={mode === 'otp' ? 'on' : ''} onClick={() => setMode('otp')}>
              验证码{isRegister ? '注册' : '登录'}
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
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className="btn-ghost otp-send-btn"
                  disabled={!canSendCode}
                  onClick={() => void handleSendCode()}
                >
                  {sending ? '发送中…' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </label>
            <p className="login-hint login-hint-left">
              {isRegister
                ? '填写手机号或邮箱 → 获取验证码 → 验证后自动注册并登录'
                : '未注册的手机号/邮箱验证后将自动创建账号'}
            </p>
          </>
        ) : (
          <>
            <label>
              邮箱
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label>
              密码
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
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
                        disabled={loading}
                        onClick={() => onDemoLogin(acc)}
                      >
                        <strong>{acc.role}</strong>
                        <span>{acc.email}</span>
                        <span>点击直接登录 · 密码 {acc.password}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {error && <p className="login-error">{error}</p>}
        {hint && !error && <p className="login-hint login-hint-success">{hint}</p>}

        <button type="submit" disabled={loading || (mode === 'otp' && !canSubmitOtp)}>
          {loading ? '处理中…' : mode === 'otp' ? (isRegister ? '注册并登录' : '登录 / 注册') : '登录'}
        </button>

        <p className="login-switch">
          {isRegister ? (
            <>已有账号？<Link to={ROUTES.login}>去登录</Link></>
          ) : (
            <>没有账号？<Link to="/register">验证码注册</Link></>
          )}
        </p>

        {backLink && (
          <p className="login-hint"><Link to={backLink}>← 返回首页</Link></p>
        )}
        {typeof __APP_BUILD_VERSION__ === 'string' && (
          <p className="login-hint login-version">版本 {__APP_BUILD_VERSION__}</p>
        )}
      </form>
    </div>
  )
}
