import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { formatAxiosApiError } from '@blockhub/i18n'
import { LocaleSwitch, useI18n, useT } from '@blockhub/i18n/react'
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
  title,
  subtitle,
  defaultEmail = '',
  defaultPassword = '',
  showPasswordLogin = true,
  defaultMode = 'otp',
  showLogo = true,
}: Props) {
  const t = useT()
  const { locale } = useI18n()
  const isEn = locale === 'en-US'
  const resolvedTitle =
    title ?? (isEn ? `${BRAND.nameEn} · ${t('admin.topbar.title')}` : `${BRAND.nameZh} ${BRAND.nameEn}`)
  const resolvedSubtitle = subtitle ?? t('admin.auth.subtitle')
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

  useEffect(() => {
    document.documentElement.lang = locale === 'en-US' ? 'en' : 'zh-CN'
  }, [locale])

  const canSendCode = useMemo(() => isValidAccount(account) && countdown === 0 && !sending, [account, countdown, sending])
  const canSubmitOtp = useMemo(() => isValidAccount(account) && /^\d{4,8}$/.test(code.trim()), [account, code])

  const goAfterLogin = () => {
    window.location.replace(resolveAdminPostLoginUrl(rawFrom))
  }

  if (getToken()) {
    return <p className="login-hint" style={{ padding: 24, textAlign: 'center' }}>{t('admin.auth.redirecting')}</p>
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
          <div className="login-brand-text">
            <h1>{resolvedTitle}</h1>
            <p>{resolvedSubtitle}</p>
          </div>
          <LocaleSwitch className="admin-locale-switch login-locale" variant="chip" />
        </div>

        {showPasswordLogin && (
          <div className="login-mode-tabs">
            <button type="button" className={mode === 'otp' ? 'on' : ''} onClick={() => setMode('otp')}>
              {t('admin.auth.tab.otp')}
            </button>
            <button type="button" className={mode === 'password' ? 'on' : ''} onClick={() => setMode('password')}>
              {t('admin.auth.tab.password')}
            </button>
          </div>
        )}

        {mode === 'otp' ? (
          <>
            <label>
              {t('admin.auth.account')}
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={t('admin.auth.account_ph')}
                required
                autoComplete="username"
              />
            </label>
            <label className="otp-code-row">
              {t('admin.auth.code')}
              <div className="otp-code-inputs">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('admin.auth.code_ph')}
                  required
                />
                <button type="button" className="btn-ghost otp-send-btn" disabled={!canSendCode} onClick={handleSendCode}>
                  {sending ? t('admin.auth.sending') : countdown > 0 ? `${countdown}s` : t('admin.auth.send')}
                </button>
              </div>
            </label>
            <p className="login-hint">{t('admin.auth.otp_hint')}</p>
          </>
        ) : (
          <>
            <label>
              {t('admin.auth.email')}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </label>
            <label>
              {t('admin.auth.password')}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </label>
          </>
        )}

        {error && <p className="login-error">{error}</p>}
        {hint && !error && <p className="login-hint">{hint}</p>}
        <button type="submit" disabled={loading || (mode === 'otp' && !canSubmitOtp)}>
          {loading
            ? t('admin.auth.submitting')
            : mode === 'otp'
              ? t('admin.auth.submit_otp')
              : t('admin.auth.submit')}
        </button>
        {typeof __APP_BUILD_VERSION__ === 'string' && (
          <p className="login-hint">{t('admin.auth.version', { v: __APP_BUILD_VERSION__ })}</p>
        )}
      </form>
    </div>
  )
}
