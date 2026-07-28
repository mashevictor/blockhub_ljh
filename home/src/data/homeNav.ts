import { ROUTES } from '../routes/paths'
import type { HomeSectionId } from '../hooks/useHomeActiveSection'

export type B2BNavIcon = 'github'

export type B2BNavItem =
  | { kind: 'scroll'; id: HomeSectionId; labelKey: string; match?: (path: string) => boolean }
  | { kind: 'link'; to: string; labelKey: string; icon?: B2BNavIcon; match?: (path: string) => boolean }

/** 首页与子站（案例/信任/定价/新闻/行业）共用导航项 · labelKey → home.* */
export const B2B_NAV_ITEMS: B2BNavItem[] = [
  {
    kind: 'scroll',
    id: 'product',
    labelKey: 'home.nav.product',
    match: (p) => p.startsWith('/industry/'),
  },
  {
    kind: 'link',
    to: ROUTES.capship,
    labelKey: 'home.nav.capship',
    icon: 'github',
    match: (p) => p === ROUTES.capship || p.startsWith('/capship'),
  },
  { kind: 'link', to: ROUTES.cases, labelKey: 'home.nav.cases', match: (p) => p.startsWith('/cases') },
  { kind: 'link', to: ROUTES.trust, labelKey: 'home.nav.trust', match: (p) => p === ROUTES.trust },
  { kind: 'link', to: ROUTES.pricing, labelKey: 'home.nav.pricing', match: (p) => p.startsWith('/pricing') || p === ROUTES.pricing },
  { kind: 'link', to: ROUTES.news, labelKey: 'home.nav.news', match: (p) => p.startsWith('/news') },
]

export function homeSectionHref(id: HomeSectionId | string): string {
  return `${ROUTES.home}#${id}`
}
