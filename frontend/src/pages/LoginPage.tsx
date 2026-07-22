import AuthPage from './AuthPage'

export default function LoginPage() {
  return (
    <AuthPage
      subtitle="统一登录入口 · 验证码注册 / 密码登录 · 按角色进入工作台"
      defaultMode="otp"
      showPasswordLogin
      showLogo
    />
  )
}
