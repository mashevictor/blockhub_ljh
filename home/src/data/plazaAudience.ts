export type AudienceType = 'public' | 'org' | 'dept' | 'users'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export interface AudienceOption {
  id: AudienceType
  /** @deprecated Prefer localize via `home.plaza.aud.{id}.*` */
  label: string
  desc: string
  badge?: string
  /** 是否写入广场公开 Feed */
  showOnPlazaFeed: boolean
  visibility: 'public' | 'org' | 'dept'
}

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    id: 'public',
    label: '@公开',
    badge: '推荐',
    desc: '所有人可见 · 进入应用广场 · 可被发现、转发',
    showOnPlazaFeed: true,
    visibility: 'public',
  },
  {
    id: 'org',
    label: '@全公司',
    desc: '组织内全员可见 · 通知推送 · 不进广场公开流',
    showOnPlazaFeed: false,
    visibility: 'org',
  },
  {
    id: 'dept',
    label: '@部门',
    desc: '仅选定部门可见 · 广场显示摘要（范围外不可打开详情）',
    showOnPlazaFeed: true,
    visibility: 'dept',
  },
  {
    id: 'users',
    label: '@指定成员',
    desc: '定向通知指定同事 · 不进广场（需登录，W4 接 API）',
    showOnPlazaFeed: false,
    visibility: 'dept',
  },
]

/** Stable ids for department chips — `value` is what we store on the selection. */
export const DEPT_PRESETS = [
  { id: 'rd', value: '研发部', key: 'home.plaza.aud.dept.rd' },
  { id: 'hr', value: 'HR', key: 'home.plaza.aud.dept.hr' },
  { id: 'sales', value: '销售部', key: 'home.plaza.aud.dept.sales' },
  { id: 'mfg', value: '制造业', key: 'home.plaza.aud.dept.mfg' },
  { id: 'mgmt', value: '管理层', key: 'home.plaza.aud.dept.mgmt' },
] as const

export interface AudienceSelection {
  type: AudienceType
  deptName?: string
}

export function audienceOptionCopy(
  t: TranslateFn | undefined,
  opt: AudienceOption,
): { label: string; desc: string; badge?: string } {
  if (!t) return { label: opt.label, desc: opt.desc, badge: opt.badge }
  return {
    label: t(`home.plaza.aud.${opt.id}.label`),
    desc: t(`home.plaza.aud.${opt.id}.desc`),
    badge: opt.badge ? t(`home.plaza.aud.${opt.id}.badge`) : undefined,
  }
}

export function audienceAtLabel(sel: AudienceSelection, t?: TranslateFn): string {
  if (sel.type === 'public') return t ? t('home.plaza.aud.public.label') : '@公开'
  if (sel.type === 'org') return t ? t('home.plaza.aud.org.label') : '@全公司'
  if (sel.type === 'dept') {
    if (sel.deptName) {
      const hit = DEPT_PRESETS.find((d) => d.value === sel.deptName)
      const name = hit && t ? t(hit.key) : sel.deptName
      return `@${name}`
    }
    return t ? t('home.plaza.aud.dept.label') : '@部门'
  }
  return t ? t('home.plaza.aud.users.label') : '@指定成员'
}

export function audiencePreviewText(sel: AudienceSelection, appName: string, t?: TranslateFn): string {
  const opt = AUDIENCE_OPTIONS.find((o) => o.id === sel.type)
  const at = audienceAtLabel(sel, t)
  if (!t) {
    const dest = opt?.showOnPlazaFeed ? '应用广场可见' : '仅受众通知'
    const reach =
      sel.type === 'public'
        ? '全员 + Feed 订阅者'
        : sel.type === 'org'
          ? '组织内全员'
          : sel.type === 'dept'
            ? sel.deptName ?? '选定部门'
            : '指定成员'
    return `${at} · ${appName} → ${dest} · 预计触达 ${reach}`
  }
  const dest = opt?.showOnPlazaFeed
    ? t('home.plaza.aud.preview.dest_feed')
    : t('home.plaza.aud.preview.dest_notify')
  let reach = t('home.plaza.aud.preview.reach_users')
  if (sel.type === 'public') reach = t('home.plaza.aud.preview.reach_public')
  else if (sel.type === 'org') reach = t('home.plaza.aud.preview.reach_org')
  else if (sel.type === 'dept') {
    if (sel.deptName) {
      const hit = DEPT_PRESETS.find((d) => d.value === sel.deptName)
      reach = hit ? t(hit.key) : sel.deptName
    } else {
      reach = t('home.plaza.aud.preview.reach_dept')
    }
  }
  return t('home.plaza.aud.preview', { at, name: appName, dest, reach })
}
