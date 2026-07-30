import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import { loginOtp, loginWithPassword, sendOtpCode } from '../auth/session'
import { getToken } from '../auth/storage'
import { ROUTES } from '../routes/paths'
import { BRAND } from '../data/brand'
import BrandMark from '../components/BrandMark'

type AuthMode = 'otp' | 'password'

function isValidAccount(v: string) {
  const trimmed = v.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true
  return /^1[3-9]\d{9}$/.test(trimmed.replace(/\s/g, ''))
}

function authErrorMessage(
  t: (key: string, vars?: Record<string, string | number>) => string,
  err: unknown,
  fallbackKey: string,
): string {
  const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
  if (!resp) return t('home.auth.err.offline')
  if (resp.status === 429) {
    return typeof resp.data?.detail === 'string' ? resp.data.detail : t('home.auth.err.rate_limit')
  }
  const detail = resp.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (resp.status === 503 || resp.status === 500) return t('home.auth.err.unavailable')
  return t(fallbackKey)
}

interface Props {
  title?: string
  subtitle?: string
  backLink?: string
  defaultEmail?: string
  defaultPassword?: string
  showPasswordLogin?: boolean
  defaultMode?: AuthMode
  showLogo?: boolean
}

export default function AuthPage({
  title,
  subtitle,
  backLink = ROUTES.home,
  defaultEmail = '',
  defaultPassword = '',
  showPasswordLogin = true,
  defaultMode = 'otp',
  showLogo = true,
}: Props) {
  const t = useT()
  const resolvedTitle = title ?? `${BRAND.nameZh} ${BRAND.nameEn}`
  const resolvedSubtitle = subtitle ?? t('home.auth.subtitle')
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
      setError(t('home.auth.err.account'))
      return
    }
    setError('')
    setHint('')
    setSending(true)
    try {
      const res = await sendOtpCode(account.trim())
      setCountdown(60)
      setHint(res.message)
    } catch (err: unknown) {
      setError(authErrorMessage(t, err, 'home.auth.err.send_fail'))
    } finally {
      setSending(false)
    }
  }

  const onSubmitOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmitOtp) {
      setError(t('home.auth.err.otp_fields'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginOtp(account.trim(), code.trim())
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(authErrorMessage(t, err, 'home.auth.err.otp_invalid'))
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
      setError(authErrorMessage(t, err, 'home.auth.err.password'))
    } finally {
      setLoading(false)
    }
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
            <h1>{resolvedTitle}</h1>
            <p>{resolvedSubtitle}</p>
          </div>
        </div>

        {showPasswordLogin && (
          <div className="login-mode-tabs">
            <button type="button" className={mode === 'otp' ? 'on' : ''} onClick={() => setMode('otp')}>
              {isRegister ? t('home.auth.tab.otp_register') : t('home.auth.tab.otp_login')}
            </button>
            <button type="button" className={mode === 'password' ? 'on' : ''} onClick={() => setMode('password')}>
              {t('home.auth.tab.password')}
            </button>
          </div>
        )}

        {mode === 'otp' ? (
          <>
            <label>
              {t('home.auth.account')}
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={t('home.auth.account_ph')}
                required
                autoComplete="username"
              />
            </label>
            <label className="otp-code-row">
              {t('home.auth.code')}
              <div className="otp-code-inputs">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('home.auth.code_ph')}
                  required
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className="btn-ghost otp-send-btn"
                  disabled={!canSendCode}
                  onClick={() => void handleSendCode()}
                >
                  {sending ? t('home.auth.sending') : countdown > 0 ? `${countdown}s` : t('home.auth.send')}
                </button>
              </div>
            </label>
            <p className="login-hint login-hint-left">
              {isRegister ? t('home.auth.register_hint') : t('home.auth.login_hint')}
            </p>
          </>
        ) : (
          <>
            <label>
              {t('home.auth.email')}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label>
              {t('home.auth.password')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
          </>
        )}

        {error && <p className="login-error">{error}</p>}
        {hint && !error && <p className="login-hint login-hint-success">{hint}</p>}

        <button type="submit" disabled={loading || (mode === 'otp' && !canSubmitOtp)}>
          {loading
            ? t('home.auth.submitting')
            : mode === 'otp'
              ? (isRegister ? t('home.auth.submit_otp_register') : t('home.auth.submit_otp_login'))
              : t('home.auth.submit_password')}
        </button>

        <p className="login-switch">
          {isRegister ? (
            <>{t('home.auth.has_account')}<Link to={ROUTES.login}>{t('home.auth.go_login')}</Link></>
          ) : (
            <>{t('home.auth.no_account')}<Link to="/register">{t('home.auth.go_register')}</Link></>
          )}
        </p>

        {backLink && (
          <p className="login-hint"><Link to={backLink}>{t('home.auth.back_home')}</Link></p>
        )}
        {typeof __APP_BUILD_VERSION__ === 'string' && (
          <p className="login-hint login-version">{t('home.auth.version', { v: __APP_BUILD_VERSION__ })}</p>
        )}
      </form>
    </div>
  )
}
