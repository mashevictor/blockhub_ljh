import AuthPage from './AuthPage'

/** Home 登录：验证码 / 密码 */
export default function LoginPage() {
  return (
    <AuthPage
      subtitle="登录您的账号"
      defaultMode="otp"
      showPasswordLogin
      showDemoAccounts={false}
    />
  )
}
