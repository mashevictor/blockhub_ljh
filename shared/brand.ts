/** 5173 Home + 5174 Admin 统一品牌 */
export const BRAND = {
  nameZh: '积木仓',
  nameEn: 'BlockHub',
  tagline: '五分钟搭好，打开就能用',
  title: '积木仓 BlockHub · 五分钟搭好，打开就能用',
  adminTitle: '积木仓 BlockHub · 管理后台',
  heroBadge: '智能应用创建入口',
  footer: '积木仓 BlockHub · 五分钟搭好，打开就能用',
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
  mark: asset('logo-mark.jpg'),
  icon32: asset('favicon-32.png'),
} as const

/** Admin 登录页 URL（生产同域 /admin/login，本地开发 5174） */
export function adminLoginUrl(): string {
  if (typeof window !== 'undefined') {
    const { origin, hostname, port } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (!isLocal) {
      return `${origin}/admin/login`
    }
    if (port === '5173') {
      return `${origin.replace(':5173', ':5174')}/admin/login`
    }
    return `${origin}/admin/login`
  }
  return `${BRAND.adminUrl}/admin/login`
}

/** Admin 工作台 URL（登录成功后进入 /admin/） */
export function adminHomeUrl(): string {
  if (typeof window !== 'undefined') {
    const { origin, hostname, port } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (isLocal && port === '5173') {
      return `${origin.replace(':5173', ':5174')}/admin/`
    }
    return `${origin}/admin/`
  }
  return `${BRAND.adminUrl}/admin/`
}

/** 登录成功后跳转：支持 ProtectedRoute 传入的 /agents 等相对路径 */
export function resolveAdminPostLoginUrl(from?: string | null): string {
  if (!from || from === '/') return adminHomeUrl()
  if (from.startsWith('http://') || from.startsWith('https://')) return from
  if (from.startsWith('/admin')) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}${from}`
  }
  const path = from.startsWith('/') ? from : `/${from}`
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/admin${path}`
}

/** Home 创建入口 URL（生产同域 /，本地 5173） */
export function homePublicUrl(): string {
  if (typeof window !== 'undefined') {
    const { origin, hostname, port } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (isLocal && port === '5174') {
      return `${origin.replace(':5174', ':5173')}/`
    }
    return `${origin}/`
  }
  return BRAND.homeUrl
}

/** 启动 seed 写入的演示账号（密码登录） */
export const DEMO_ACCOUNTS = [
  { role: '管理员', email: 'admin@trackchat.local', password: 'admin123' },
  { role: '使用者', email: 'employee@trackchat.local', password: 'emp123' },
] as const

export const THEME_STORAGE_KEY = 'blockhub-theme'
