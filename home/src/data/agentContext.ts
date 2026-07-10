/** 智能体 >> 符号 · 按页面/场景切换提示文案 */

export type AgentContextKey =
  | 'landing_hero'
  | 'landing_product'
  | 'landing_case'
  | 'landing_contact'
  | 'landing_booking'
  | 'booking_contact'
  | 'booking_salutation'
  | 'booking_company'
  | 'booking_review'
  | 'create_prompt'
  | 'create_industry'
  | 'create_module'
  | 'plaza_feed'
  | 'plaza_my'

export interface AgentContextCopy {
  /** >> 按钮内短标签 */
  chevLabel: string
  placeholder: string
  ghost: string
}

export const AGENT_CONTEXTS: Record<AgentContextKey, AgentContextCopy> = {
  landing_hero: {
    chevLabel: '探索',
    placeholder: '描述需求，或 >> 在线体验',
    ghost: '输入 >> 探索产品，或直接描述需求…',
  },
  landing_product: {
    chevLabel: '模板',
    placeholder: '>> 选 AI 模板，或描述业务场景',
    ghost: '输入 >> 浏览模板，或描述要落地的场景…',
  },
  landing_case: {
    chevLabel: '案例',
    placeholder: '>> 参考案例，或描述您的需求',
    ghost: '输入 >> 查看行业案例，或描述应用想法…',
  },
  landing_contact: {
    chevLabel: '多选',
    placeholder: '描述需求，或 >> 多选模块',
    ghost: '输入 >> 多选模块，或直接描述需求…',
  },
  landing_booking: {
    chevLabel: '预约',
    placeholder: '>> 邮箱或电话',
    ghost: '邮箱或手机号',
  },
  booking_contact: {
    chevLabel: '联系',
    placeholder: '>> 邮箱或电话',
    ghost: '邮箱或手机号',
  },
  booking_salutation: {
    chevLabel: '称呼',
    placeholder: '>> 称呼（选填）',
    ghost: '可跳过',
  },
  booking_company: {
    chevLabel: '公司',
    placeholder: '>> 公司名称（选填）',
    ghost: '填写后自动提交',
  },
  booking_review: {
    chevLabel: '完成',
    placeholder: '>> 预约已提交',
    ghost: '我们会尽快与您联系',
  },
  create_prompt: {
    chevLabel: '多选',
    placeholder: '描述需求，或 >> 多选模块',
    ghost: '输入 >> 多选模块，或直接描述需求…',
  },
  create_industry: {
    chevLabel: '行业',
    placeholder: '>> 选择行业，或补充场景描述',
    ghost: '输入 >> 挑选行业包，或描述业务场景…',
  },
  create_module: {
    chevLabel: '模块',
    placeholder: '>> 搭配模块，或描述应用组合',
    ghost: '输入 >> 自由搭配模块，或描述组合方式…',
  },
  plaza_feed: {
    chevLabel: '广场',
    placeholder: '>> 浏览公开应用，或去创建',
    ghost: '输入 >> 逛应用广场，或描述想做的应用…',
  },
  plaza_my: {
    chevLabel: '我的',
    placeholder: '>> 管理我的应用，或继续创建',
    ghost: '输入 >> 管理已发布应用，或描述新需求…',
  },
}

export function viewModeToContext(mode: 'prompt' | 'industry' | 'module'): AgentContextKey {
  if (mode === 'industry') return 'create_industry'
  if (mode === 'module') return 'create_module'
  return 'create_prompt'
}
