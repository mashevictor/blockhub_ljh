export type AudienceType = 'public' | 'org' | 'dept' | 'users'

export interface AudienceOption {
  id: AudienceType
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
    desc: '所有人可见 · 进入广场 Newsfeed · 可被发现、转发',
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

export const DEPT_PRESETS = ['研发部', 'HR', '销售部', '制造业', '管理层'] as const

export interface AudienceSelection {
  type: AudienceType
  deptName?: string
}

export function audienceAtLabel(sel: AudienceSelection): string {
  if (sel.type === 'public') return '@公开'
  if (sel.type === 'org') return '@全公司'
  if (sel.type === 'dept') return sel.deptName ? `@${sel.deptName}` : '@部门'
  return '@指定成员'
}

export function audiencePreviewText(sel: AudienceSelection, appName: string): string {
  const opt = AUDIENCE_OPTIONS.find((o) => o.id === sel.type)
  const at = audienceAtLabel(sel)
  const dest = opt?.showOnPlazaFeed ? '广场可见' : '仅受众通知'
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
