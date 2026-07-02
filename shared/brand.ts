/** 5173 Home + 5174 Admin 统一品牌 */
export const BRAND = {
  nameZh: '积木仓',
  nameEn: 'BlockHub',
  tagline: '五分钟搭好，老板员工即刻用',
  title: '积木仓 BlockHub · 五分钟搭好，老板员工即刻用',
  adminTitle: '积木仓 BlockHub · 管理后台',
  heroBadge: '智能体应用创建入口',
  footer: '积木仓 BlockHub · 五分钟搭好，老板员工即刻用',
  homeUrl: 'http://127.0.0.1:5173',
  adminUrl: 'http://127.0.0.1:5174',
} as const

/** Home 用 / ，Admin 用 /admin/ — 静态资源必须带 BASE_URL */
function asset(path: string): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : '/'
  const normalized = `${base}${path.replace(/^\//, '')}`.replace(/\/{2,}/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export const LOGO = {
  mark: asset('logo-mark.svg'),
  icon32: asset('favicon-32.png'),
} as const

/** 启动 seed 写入的演示账号（密码登录） */
export const DEMO_ACCOUNTS = [
  { role: '管理员', email: 'admin@trackchat.local', password: 'admin123' },
  { role: '员工', email: 'employee@trackchat.local', password: 'emp123' },
] as const

export const THEME_STORAGE_KEY = 'blockhub-theme'
