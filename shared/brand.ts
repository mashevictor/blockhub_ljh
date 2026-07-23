/** 5173 Home + 5174 Admin 统一品牌 */
export const BRAND = {
  nameZh: '积木仓',
  nameEn: 'BlockHub',
  tagline: '五分钟搭好，打开就能用',
  title: '积木仓 BlockHub · 五分钟搭好，打开就能用',
  adminTitle: '积木仓 BlockHub · 管理后台',
  heroBadge: '智能应用创建入口',
  /** >> 品牌主张 · 全站统一（UI 前加 >> 符号） */
  agentSignLine: '重新定义智能体新交互',
  footer: '积木仓 BlockHub · 五分钟搭好，打开就能用',
  homeUrl: 'http://127.0.0.1:5173',
  adminUrl: 'http://127.0.0.1:5174',
} as const

/** Home 用 / ，Admin 用 /admin/ — 静态资源必须带 BASE_URL */
function readBuildVersion(): string {
  if (typeof document === 'undefined') return ''
  return document.querySelector('meta[name="app-build-version"]')?.getAttribute('content') ?? ''
}

function asset(path: string): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : '/'
  const normalized = `${base}${path.replace(/^\//, '')}`.replace(/\/{2,}/g, '/')
  const url = normalized.startsWith('/') ? normalized : `/${normalized}`
  const version = readBuildVersion()
  return version ? `${url}?v=${version}` : url
}

export const LOGO = {
  /** UI 顶栏/登录用 48×48 PNG（~1.5KB）；勿用 logo-mark.jpg（源图 ~400KB，弱网会白屏闪一下） */
  mark: asset('favicon-48.png'),
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
    if (port === '5173' || port === '5175') {
      return `${origin.replace(/:517[35]$/, ':5174')}/admin/login`
    }
    return `${origin}/admin/login`
  }
  return `${BRAND.adminUrl}/admin/login`
}

/** 带 returnUrl 的 Admin 登录页（Home 计费/Checkout 等） */
export function adminLoginUrlWithReturn(returnPath: string): string {
  const base = adminLoginUrl()
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}from=${encodeURIComponent(returnPath)}`
}

/** Admin 工作台 URL（登录成功后进入 /admin/） */
export function adminHomeUrl(): string {
  if (typeof window !== 'undefined') {
    const { origin, hostname, port } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (isLocal && (port === '5173' || port === '5175')) {
      return `${origin.replace(/:517[35]$/, ':5174')}/admin/`
    }
    return `${origin}/admin/`
  }
  return `${BRAND.adminUrl}/admin/`
}

/**
 * Home 公开页路径：登录后应回到官网而非 /admin/…
 * （ProtectedRoute 的 /agents 等仍进管理后台）
 */
export function isHomeReturnPath(path: string): boolean {
  const p = path.split('?')[0].split('#')[0]
  if (!p.startsWith('/')) return false
  if (p.startsWith('/admin')) return false
  if (p.startsWith('/r/')) return true
  const homeRoots = [
    '/account',
    '/pricing',
    '/plaza',
    '/capship',
    '/industry',
    '/create',
    '/demo',
    '/docs',
    '/opensource',
  ]
  return homeRoots.some((root) => p === root || p.startsWith(`${root}/`))
}

/** Home 创建入口 URL（生产同域 /，本地 5173） */
export function homePublicUrl(): string {
  if (typeof window !== 'undefined') {
    const { origin, hostname, port } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (isLocal && (port === '5174' || port === '5175')) {
      return `${origin.replace(/:517[45]$/, ':5173')}/`
    }
    return `${origin}/`
  }
  return BRAND.homeUrl
}

/** 将相对路径拼到 Home origin（本地跨端口） */
export function homeAbsoluteUrl(path: string): string {
  const base = homePublicUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/**
 * 登录成功后跳转：
 * - Home 路径（/account/billing、/pricing/…）→ 回官网
 * - Runtime（/r/…）→ 回 Runtime
 * - Admin 相对路径（/agents）或 /admin/… → 管理后台
 */
export function resolveAdminPostLoginUrl(from?: string | null): string {
  if (!from || from === '/' || from === '/login' || from === '/register') {
    return adminHomeUrl()
  }
  if (from.startsWith('http://') || from.startsWith('https://')) return from

  const path = from.startsWith('/') ? from : `/${from}`

  if (isHomeReturnPath(path)) {
    if (path.startsWith('/r/')) {
      // Runtime 本地 5175；生产同域 /r/
      if (typeof window !== 'undefined') {
        const { origin, hostname, port } = window.location
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
        if (isLocal && port !== '5175') {
          return `${origin.replace(/:517[34]$/, ':5175')}${path}`
        }
        return `${origin}${path}`
      }
    }
    return homeAbsoluteUrl(path)
  }

  if (path.startsWith('/admin')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : BRAND.adminUrl
    if (typeof window !== 'undefined') {
      const { hostname, port } = window.location
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
      if (isLocal && (port === '5173' || port === '5175')) {
        return `${origin.replace(/:517[35]$/, ':5174')}${path}`
      }
    }
    return `${origin}${path}`
  }

  const origin =
    typeof window !== 'undefined'
      ? (() => {
          const { origin: o, hostname, port } = window.location
          const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
          if (isLocal && (port === '5173' || port === '5175')) {
            return o.replace(/:517[35]$/, ':5174')
          }
          return o
        })()
      : BRAND.adminUrl
  return `${origin}/admin${path}`
}

/** 仅供本地/E2E 环境变量对照；禁止在登录页 UI 展示账号或密码 */
export const DEMO_ACCOUNTS = [] as const

export const THEME_STORAGE_KEY = 'blockhub-theme'
