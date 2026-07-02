import AuthPage from './AuthPage'

export default function LoginPage() {
  return (
    <AuthPage
      subtitle="员工 / 创建者登录"
      backLink="/"
      defaultEmail="employee@trackchat.local"
      defaultPassword="emp123"
    />
  )
}
