import { ROUTES } from '../routes/paths'
import type { HomeSectionId } from '../hooks/useHomeActiveSection'

export type B2BNavItem =
  | { kind: 'scroll'; id: HomeSectionId; label: string; match?: (path: string) => boolean }
  | { kind: 'link'; to: string; label: string; match?: (path: string) => boolean }

/** 首页与子站（案例/信任/定价/新闻/行业）共用导航项 */
export const B2B_NAV_ITEMS: B2BNavItem[] = [
  {
    kind: 'scroll',
    id: 'product',
    label: '产品能力',
    match: (p) => p.startsWith('/industry/'),
  },
  { kind: 'link', to: ROUTES.cases, label: '落地案例', match: (p) => p.startsWith('/cases') },
  { kind: 'link', to: ROUTES.trust, label: '信任合规', match: (p) => p === ROUTES.trust },
  { kind: 'link', to: ROUTES.pricing, label: '定价说明', match: (p) => p === ROUTES.pricing },
  { kind: 'link', to: ROUTES.news, label: '新闻动态', match: (p) => p.startsWith('/news') },
]

export function homeSectionHref(id: HomeSectionId | string): string {
  return `${ROUTES.home}#${id}`
}
