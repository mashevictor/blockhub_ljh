import { useT } from '@blockhub/i18n/react'
import AuthPage from './AuthPage'

export default function LoginPage() {
  const t = useT()
  return (
    <AuthPage
      subtitle={t('admin.auth.login_subtitle')}
      defaultMode="otp"
      showPasswordLogin
      showLogo
    />
  )
}
