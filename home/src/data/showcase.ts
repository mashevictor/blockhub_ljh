/** 首页展示：41 项能力 · 11 个助手 · 145 业务场景 · 5 端交付 */

export interface CapabilityItem {
  id: string
  name: string
  iconKey: string
  desc: string
  color: string
}

export interface IndustryItem {
  key: string
  name: string
  iconKey: string
  count: number
  desc: string
  color: string
  fullPack?: boolean
  baseKey?: string
}

export interface PlatformItem {
  id: string
  name: string
  sub: string
  iconKey: string
  color: string
  status: 'ready' | 'soon'
}

export const CAPABILITIES_SHOWCASE: CapabilityItem[] = [
  { id: 'creation', name: '智能创建', iconKey: 'creation', desc: '选场景、评估方案、一键发布', color: '#6366f1' },
  { id: 'chat_qa', name: '智能问答', iconKey: 'chat_qa', desc: '结合知识库回答制度与业务问题', color: '#4338ca' },
  { id: 'kb', name: '知识库', iconKey: 'kb', desc: '上传文档，智能整理与检索', color: '#059669' },
  { id: 'approval', name: '审批流程', iconKey: 'approval', desc: '请假、报销等在线提交与审批', color: '#dc2626' },
  { id: 'report', name: '数据报表', iconKey: 'report', desc: '看板、图表与自然语言查数', color: '#0ea5e9' },
  { id: 'notify', name: '消息通知', iconKey: 'notify', desc: '审批提醒、公告与多渠道推送', color: '#f59e0b' },
  { id: 'integration', name: '系统对接', iconKey: 'integration', desc: 'ERP、OA、企微等系统打通', color: '#0f766e' },
  { id: 'workflow', name: '流程编排', iconKey: 'workflow', desc: '可视化配置表单与工作流', color: '#8b5cf6' },
  { id: 'security', name: '安全合规', iconKey: 'security', desc: '权限、脱敏与操作审计', color: '#64748b' },
  { id: 'portal', name: '多端门户', iconKey: 'portal', desc: '一次发布，各端同步可用', color: '#ec4899' },
]

export const INDUSTRIES_SHOWCASE: IndustryItem[] = [
  { key: 'office', name: '通用办公', iconKey: 'office', count: 96, desc: '人事、财务、审批、知识库', color: '#6366f1', fullPack: true },
  { key: 'mfg', name: '传统制造', iconKey: 'mfg', count: 12, desc: '报修、SOP、质检、MES', color: '#3b82f6', fullPack: true },
  { key: 'sales', name: '销售行业', iconKey: 'sales', count: 12, desc: '话术、漏斗、合同、CRM', color: '#ef4444', fullPack: true },
  { key: 'med', name: '医疗健康', iconKey: 'med', count: 12, desc: '指南、排班、导诊、HIS', color: '#10b981', fullPack: true },
  { key: 'game', name: '游戏娱乐', iconKey: 'game', count: 13, desc: '玩家 FAQ、客服、活动通知', color: '#a855f7', fullPack: true },
  { key: 'retail', name: '零售电商', iconKey: 'retail', count: 10, desc: '库存、会员、促销、订单', color: '#f97316', baseKey: 'sales' },
  { key: 'edu', name: '教育培训', iconKey: 'edu', count: 9, desc: '课程、题库、排课、家校', color: '#2563eb', baseKey: 'office' },
  { key: 'finance', name: '金融服务', iconKey: 'finance', count: 11, desc: '合规、风控、理财、尽调', color: '#0284c7', baseKey: 'office' },
  { key: 'logistics', name: '物流仓储', iconKey: 'logistics', count: 10, desc: '运单、仓储、调度、签收', color: '#ca8a04', baseKey: 'mfg' },
  { key: 'realestate', name: '房地产', iconKey: 'realestate', count: 9, desc: '看房、签约、物业、报修', color: '#78716c', baseKey: 'sales' },
  { key: 'hotel', name: '酒店餐饮', iconKey: 'hotel', count: 8, desc: '预订、排班、客诉、巡检', color: '#ec4899', baseKey: 'office' },
  { key: 'energy', name: '能源电力', iconKey: 'energy', count: 10, desc: '巡检、工单、能耗、安全', color: '#eab308', baseKey: 'mfg' },
  { key: 'gov', name: '政务公用', iconKey: 'gov', count: 11, desc: '办事指南、诉求、审批', color: '#475569', baseKey: 'office' },
  { key: 'legal', name: '法律服务', iconKey: 'legal', count: 8, desc: '案件、合同、法规检索', color: '#334155', baseKey: 'office' },
  { key: 'hr', name: '人力资源', iconKey: 'hr', count: 12, desc: '招聘、绩效、培训、薪酬', color: '#8b5cf6', baseKey: 'office' },
  { key: 'marketing', name: '市场营销', iconKey: 'marketing', count: 9, desc: '活动、线索、内容、投放', color: '#fb923c', baseKey: 'sales' },
  { key: 'construction', name: '建筑工程', iconKey: 'construction', count: 10, desc: '进度、安全、材料、验收', color: '#b45309', baseKey: 'mfg' },
  { key: 'agriculture', name: '农业', iconKey: 'agriculture', count: 7, desc: '溯源、巡检、补贴、产销', color: '#65a30d', baseKey: 'office' },
  { key: 'media', name: '传媒内容', iconKey: 'media', count: 9, desc: '选题、审核、版权、分发', color: '#d946ef', baseKey: 'game' },
  { key: 'auto', name: '汽车交通', iconKey: 'auto', count: 10, desc: '售后、试驾、配件、工单', color: '#06b6d4', baseKey: 'sales' },
]

export const PLATFORMS_SHOWCASE: PlatformItem[] = [
  { id: 'web', name: '网页版', sub: 'Chrome · Safari · Edge', iconKey: 'web', color: '#6366f1', status: 'ready' },
  { id: 'ios', name: 'iOS', sub: 'iPhone · iPad 原生', iconKey: 'ios', color: '#f8fafc', status: 'ready' },
  { id: 'android', name: 'Android', sub: '手机 · 平板 APK', iconKey: 'android', color: '#22c55e', status: 'ready' },
  { id: 'windows', name: 'Windows', sub: '桌面客户端 · 托盘', iconKey: 'windows', color: '#0ea5e9', status: 'ready' },
  { id: 'mac', name: 'macOS', sub: 'Mac 桌面 · 菜单栏', iconKey: 'mac', color: '#94a3b8', status: 'ready' },
]

export const SCENARIO_BREAKDOWN = [
  { label: '通用办公', count: 96, color: '#6366f1', iconKey: 'office' },
  { label: '制造业', count: 12, color: '#3b82f6', iconKey: 'mfg' },
  { label: '销售', count: 12, color: '#ef4444', iconKey: 'sales' },
  { label: '医疗', count: 12, color: '#10b981', iconKey: 'med' },
  { label: '游戏', count: 13, color: '#a855f7', iconKey: 'game' },
]

export const OFFICE_CATEGORY_ICON: Record<string, string> = {
  '人事行政': 'hr',
  '财务法务': 'finance',
  '知识协同': 'kb',
  '流程审批': 'approval',
  '数据报表': 'report',
  '消息通知': 'notify',
  'IT与资产': 'integration',
  '外部对接': 'integration',
}

export const API_INDUSTRY_KEYS = new Set(['office', 'mfg', 'sales', 'med', 'game'])

export function resolveIndustryApiKey(key: string): string {
  if (API_INDUSTRY_KEYS.has(key)) return key
  const ind = INDUSTRIES_SHOWCASE.find((i) => i.key === key)
  return ind?.baseKey && API_INDUSTRY_KEYS.has(ind.baseKey) ? ind.baseKey : 'office'
}

export function resolveCategoryIcon(category: string, kind: 'office' | 'industry'): string {
  if (kind === 'office') return OFFICE_CATEGORY_ICON[category] ?? 'creation'
  return INDUSTRY_ICONS_FALLBACK[category] ?? 'office'
}

const INDUSTRY_ICONS_FALLBACK: Record<string, string> = {
  '临床知识': 'med', '合规管理': 'security', '人事管理': 'hr', '物资管理': 'retail',
  '患者服务': 'med', '数据安全': 'security', '医疗安全': 'security', '数据分析': 'report',
  '培训管理': 'edu', '系统集成': 'integration', '临床管理': 'approval',
  '设备管理': 'mfg', '知识管理': 'kb', '生产管理': 'mfg', '质量管理': 'approval',
  '物料管理': 'logistics', '安全管理': 'security', '绿色制造': 'energy',
  '审批流程': 'approval', '客户管理': 'sales', '玩家服务': 'game', '客服管理': 'chat_qa',
  'C端功能': 'portal', '安全合规': 'security', '社区管理': 'hr',
}
