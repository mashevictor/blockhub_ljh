/** 管理后台角色：与后端 User.role 对齐 */

export type AppRole = 'admin' | 'tenant_owner' | 'employee' | string

/**
 * 权限矩阵（侧栏 / 路由）
 *
 * | 菜单           | admin（平台/演示租户管理员） | tenant_owner（个人租户所有者，OTP/企微新注册） | employee（租户成员） |
 * |----------------|------------------------------|-----------------------------------------------|----------------------|
 * | 工作台         | ✓                            | ✓                                             | ✓                    |
 * | 能力中心       | ✓                            | ✓                                             |                      |
 * | 能力审核       | ✓                            | ✓                                             |                      |
 * | 业务场景       | ✓                            | ✓                                             |                      |
 * | 创建应用       | ✓                            | ✓                                             |                      |
 * | 智能问答       | ✓                            | ✓                                             | ✓                    |
 * | 上海话语音     | ✓                            | ✓                                             | ✓                    |
 * | 知识库         | ✓                            | ✓                                             | ✓                    |
 * | 审批中心       | ✓                            | ✓                                             | ✓                    |
 * | 合同盖章       | ✓                            | ✓                                             |                      |
 * | 数据报表       | ✓                            | ✓                                             |                      |
 * | 系统集成       | ✓                            | ✓                                             |                      |
 * | 租户配置       | ✓                            | ✓                                             |                      |
 * | 消息通知       | ✓                            | ✓                                             | ✓                    |
 *
 * 说明：tenant_owner = 本租户管理员（可创建/配置本空间）；跨租户平台特权仅 admin。
 */

import type { AuthUser } from '../auth/session'

/** 本租户管理权限（含个人空间所有者） */
export function isTenantAdmin(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'tenant_owner'
}

/** 平台级管理员（演示租户 / 运维账号） */
export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === 'admin'
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return isTenantAdmin(user?.role)
}

export function canAccessRoute(user: AuthUser | null | undefined, allowed: AppRole[]): boolean {
  return canAccessRole(user?.role, allowed)
}

/**
 * allowed 含 `admin` 时，tenant_owner 一并放行（本租户管理）。
 * allowed 仅写 employee 时，三者都可走工作台公共项时请显式列出 admin/tenant_owner/employee。
 */
export function canAccessRole(role: string | null | undefined, allowed: AppRole[]): boolean {
  if (!role) return false
  if (allowed.includes(role)) return true
  if (role === 'tenant_owner' && allowed.includes('admin')) return true
  return false
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

const ROLE_FALLBACK: Record<string, string> = {
  admin: '管理员',
  tenant_owner: '空间所有者',
  employee: '使用者',
}

export function roleDisplayLabel(
  role: string | null | undefined,
  t?: TranslateFn,
): string {
  if (!role) return ''
  if (t) {
    if (role === 'admin') return t('admin.role.admin')
    if (role === 'tenant_owner') return t('admin.role.tenant_owner')
    if (role === 'employee') return t('admin.role.employee')
  }
  return ROLE_FALLBACK[role] ?? role
}

/** Admin-only backend modules（路径级提示；实际以 RoleGate + canAccessRole 为准） */
export const ADMIN_ONLY_PATHS = [
  '/agents',
  '/scenarios',
  '/create',
  '/creation',
  '/reports',
  '/report',
  '/contracts',
  '/integrations',
  '/settings/tenant',
  '/capabilities/review',
] as const

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
