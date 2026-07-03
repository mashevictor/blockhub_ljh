import AuthPage from './AuthPage'

/** Home 注册：默认验证码流程（验证后自动建号） */
export default function RegisterPage() {
  return (
    <AuthPage
      subtitle="注册 · 验证码快捷开通"
      defaultMode="otp"
      showPasswordLogin
    />
  )
}
