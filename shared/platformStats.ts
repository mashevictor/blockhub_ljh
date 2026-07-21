/** 首页 / 管理端统一展示的平台规模（用户向文案用）
 *  scenarios = ALL_INDUSTRY_PACKS 场景合计（office 66 + 行业 244，含销售 64）
 *  capabilities = capability_registry.list_capabilities() 条数
 *  agents = seed.AGENTS 前 12 个「核心助手」（创建/问答/审批…）；全量 catalog 助手更多
 */
export const PLATFORM_STATS = {
  capabilities: 78,
  agents: 12,
  scenarios: 310,
  platforms: 5,
  officeScenarios: 66,
  industryScenarios: 244,
  officeGroups: 8,
  industryPacks: 20,
} as const
