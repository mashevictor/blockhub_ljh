import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { formatAxiosApiError } from '@blockhub/i18n'
import { useT } from '@blockhub/i18n/react'
import { loginOtp, loginWithPassword, sendOtpCode } from '../auth/session'
import { getToken } from '../auth/storage'
import { BRAND, resolveAdminPostLoginUrl } from '../data/brand'
import BrandMark from '../components/BrandMark'

type AuthMode = 'otp' | 'password'

function isValidAccount(v: string) {
  const trimmed = v.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true
  return /^1[3-9]\d{9}$/.test(trimmed.replace(/\s/g, ''))
}

interface Props {
  title?: string
  subtitle?: string
  defaultEmail?: string
  defaultPassword?: string
  showPasswordLogin?: boolean
  defaultMode?: AuthMode
  showLogo?: boolean
}

export default function AuthPage({
  title = `${BRAND.nameZh} ${BRAND.nameEn}`,
  subtitle = '登录或注册',
  defaultEmail = '',
  defaultPassword = '',
  showPasswordLogin = true,
  defaultMode = 'otp',
  showLogo = true,
}: Props) {
  const t = useT()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  /** Home 传 ?from=；ProtectedRoute 传 location.state.from — 两者都要认 */
  const rawFrom =
    (location.state as { from?: string } | null)?.from ||
    searchParams.get('from') ||
    undefined

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

  useEffect(() => {
    if (getToken()) {
      window.location.replace(resolveAdminPostLoginUrl(rawFrom))
    }
  }, [rawFrom])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const canSendCode = useMemo(() => isValidAccount(account) && countdown === 0 && !sending, [account, countdown, sending])
  const canSubmitOtp = useMemo(() => isValidAccount(account) && /^\d{4,8}$/.test(code.trim()), [account, code])

  const goAfterLogin = () => {
    window.location.replace(resolveAdminPostLoginUrl(rawFrom))
  }

  if (getToken()) {
    return <p className="login-hint" style={{ padding: 24, textAlign: 'center' }}>正在进入管理后台…</p>
  }

  const handleSendCode = async () => {
    setError('')
    setHint('')
    setSending(true)
    try {
      const res = await sendOtpCode(account.trim())
      setCountdown(60)
      setHint(res.message)
    } catch (err: unknown) {
      setError(formatAxiosApiError(err, t, t('error.SEND_CODE_FAILED')))
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
      goAfterLogin()
    } catch (err: unknown) {
      setError(formatAxiosApiError(err, t, t('error.INVALID_CODE')))
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
      goAfterLogin()
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number } })?.response
      if (!resp) {
        setError(t('error.NETWORK_ERROR'))
      } else {
        setError(formatAxiosApiError(err, t, t('error.LOGIN_FAILED')))
      }
    } finally {
      setLoading(false)
    }
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
                placeholder="手机号或邮箱"
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
                  placeholder="验证码"
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
          </>
        )}

        {error && <p className="login-error">{error}</p>}
        {hint && !error && <p className="login-hint">{hint}</p>}
        <button type="submit" disabled={loading || (mode === 'otp' && !canSubmitOtp)}>
          {loading ? '登录中…' : mode === 'otp' ? '登录 / 注册' : '登录'}
        </button>
        {typeof __APP_BUILD_VERSION__ === 'string' && (
          <p className="login-hint">版本 {__APP_BUILD_VERSION__}</p>
        )}
      </form>
    </div>
  )
}
