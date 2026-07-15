import { ROUTES } from '../routes/paths'
import { homeSectionHref } from './homeNav'

export interface SiteFooterLink {
  label: string
  to: string
  external?: boolean
}

export interface SiteFooterColumn {
  title: string
  links: SiteFooterLink[]
}

export const SITE_FOOTER_COLUMNS: SiteFooterColumn[] = [
  {
    title: '产品',
    links: [
      { label: '生成应用', to: homeSectionHref('contact-create') },
      { label: 'CapShip 开源', to: ROUTES.capship },
      { label: '应用广场', to: ROUTES.plazaFeed },
      { label: '我的应用', to: ROUTES.plazaMyApps },
      { label: '管理后台', to: '/admin/login', external: true },
    ],
  },
  {
    title: '解决方案',
    links: [
      { label: '20 个行业方案', to: homeSectionHref('product') },
      { label: '落地案例', to: ROUTES.cases },
      { label: '模块积木库', to: homeSectionHref('product') },
      { label: '五端发布', to: homeSectionHref('contact-create') },
    ],
  },
  {
    title: '资源',
    links: [
      { label: '信任与合规', to: ROUTES.trust },
      { label: '定价说明', to: ROUTES.pricing },
      { label: '新闻动态', to: ROUTES.news },
      { label: '资料下载', to: '/downloads/one-pager-mfg.html', external: true },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '预约演示', to: homeSectionHref('contact-demo') },
      { label: '在线体验', to: homeSectionHref('contact-create') },
      { label: '联系我们', to: 'mailto:hello@blockhub.local' },
      { label: '关于积木仓', to: ROUTES.news },
    ],
  },
]

export const SITE_FOOTER_LEGAL: SiteFooterLink[] = [
  { label: '隐私政策', to: ROUTES.trustDoc('privacy') },
  { label: '服务条款', to: ROUTES.trustDoc('terms') },
  { label: '安全合规', to: ROUTES.trust },
]
