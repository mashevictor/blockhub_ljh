import { ROUTES } from '../routes/paths'
import { homeSectionHref } from './homeNav'

export interface SiteFooterLink {
  labelKey: string
  to: string
  external?: boolean
}

export interface SiteFooterColumn {
  titleKey: string
  links: SiteFooterLink[]
}

export const SITE_FOOTER_COLUMNS: SiteFooterColumn[] = [
  {
    titleKey: 'home.footer.col.product',
    links: [
      { labelKey: 'home.footer.link.create', to: homeSectionHref('contact-create') },
      { labelKey: 'home.footer.link.capship', to: ROUTES.capship },
      { labelKey: 'home.footer.link.plaza', to: ROUTES.plazaFeed },
      { labelKey: 'home.footer.link.my_apps', to: ROUTES.plazaMyApps },
      { labelKey: 'home.footer.link.admin', to: '/admin/login', external: true },
    ],
  },
  {
    titleKey: 'home.footer.col.solutions',
    links: [
      { labelKey: 'home.footer.link.industries', to: homeSectionHref('product') },
      { labelKey: 'home.footer.link.cases', to: ROUTES.cases },
      { labelKey: 'home.footer.link.modules', to: homeSectionHref('product') },
      { labelKey: 'home.footer.link.platforms', to: homeSectionHref('contact-create') },
    ],
  },
  {
    titleKey: 'home.footer.col.resources',
    links: [
      { labelKey: 'home.footer.link.trust', to: ROUTES.trust },
      { labelKey: 'home.footer.link.pricing', to: ROUTES.pricing },
      { labelKey: 'home.footer.link.billing', to: ROUTES.accountBilling },
      { labelKey: 'home.footer.link.news', to: ROUTES.news },
      { labelKey: 'home.footer.link.downloads', to: '/downloads/one-pager-mfg.pdf', external: true },
    ],
  },
  {
    titleKey: 'home.footer.col.company',
    links: [
      { labelKey: 'home.footer.link.demo', to: homeSectionHref('contact-demo') },
      { labelKey: 'home.footer.link.try', to: homeSectionHref('contact-create') },
      { labelKey: 'home.footer.link.contact', to: 'mailto:hello@blockhub.local' },
      { labelKey: 'home.footer.link.about', to: ROUTES.news },
    ],
  },
]

export const SITE_FOOTER_LEGAL: SiteFooterLink[] = [
  { labelKey: 'home.footer.legal.privacy', to: ROUTES.trustDoc('privacy') },
  { labelKey: 'home.footer.legal.terms', to: ROUTES.trustDoc('terms') },
  { labelKey: 'home.footer.legal.security', to: ROUTES.trust },
]
