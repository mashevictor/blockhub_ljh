import AuthPage from './AuthPage'

export default function LoginPage() {
  return (
    <AuthPage
      subtitle="管理后台登录"
      defaultEmail="admin@trackchat.local"
      defaultPassword="admin123"
      defaultMode="password"
      showDemoAccounts
      showLogo
    />
  )
}
