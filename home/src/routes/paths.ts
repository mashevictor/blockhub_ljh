/** Home SPA 路由常量 */
export const ROUTES = {
  home: '/',
  industryHub: '/industry',
  industryDetail: (key: string) => `/industry/${key}`,
  shanghaiVoice: '/agents/shanghai-voice',
  login: '/login',
  register: '/register',
  /** 应用广场 — 所有人 @公开 的应用 */
  plazaFeed: '/plaza',
  /** 我的应用 — 本浏览器创建者发布的应用 */
  plazaMyApps: '/plaza/my',
  plazaApps: '/plaza',
  /** 预约资料包专属页 */
  share: (token: string) => `/share/${token}`,
  shareShort: (token: string) => `/s/${token}`,
  /** 官网 enrichment 子站 */
  trust: '/trust',
  trustDoc: (docId: string) => `/trust/${docId}`,
  cases: '/cases',
  caseDetail: (slug: string) => `/cases/${slug}`,
  pricing: '/pricing',
  news: '/news',
  newsDetail: (slug: string) => `/news/${slug}`,
  rolePage: (role: string) => `/for/${role}`,
  /** CapShip 开源落地页 */
  capship: '/capship',
  /** 行业静态落地页 HTML（非 SPA 目录） */
  industrySiteHtml: (packKey: string) => `/industry-sites/${packKey}/index.html`,
  contactDemo: '/#contact-demo',
} as const
