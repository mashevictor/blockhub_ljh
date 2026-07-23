/** 官网 · 套餐定价（Free / Plus / Business / Enterprise） */

export interface PricingTier {
  id: string
  name: string
  range: string
  desc: string
  segment: 'c' | 'b'
  features: string[]
  /** 不含项（展示为限制说明） */
  limits?: string[]
  featured?: boolean
  tag?: string
  cta: 'start' | 'buy' | 'sales' | 'enterprise'
  ctaLabel: string
}

export interface PricingFaq {
  q: string
  a: string
}

/** 产品文案：智能出页（原技术名 Codegen，官网不出现） */
export const SMART_PAGE_LABEL = '智能出页'
export const SMART_PAGE_HINT =
  '用一句话让 AI 生成整页可运行界面（小游戏、工具页等），也可对已生成页做二次修订；点选现成正式能力不占此次数'

/** 对话改页：自然语言改菜单/表单 */
export const COMPOSE_EDIT_LABEL = '对话改页'
export const COMPOSE_EDIT_HINT =
  '在 Runtime 用自然语言改菜单、表单字段与控件（例如「请假开始日期改成日期选择」）；每次成功改动计 1 次，澄清问答不计次'

export const PRICING_TIP =
  'Plus 版仅限 ≤3 人微型团队使用，企业规模化商用请选购 Business 及以上版本'

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'c_free',
    name: '免费版 Free',
    range: '¥0/永久',
    desc: '个人试用、原型验证',
    segment: 'c',
    cta: 'start',
    ctaLabel: '立即开始',
    features: [
      '应用上限 10 个',
      '对话改页 10 次/天',
      '智能出页 1 次/天',
      '代码下载 1 次',
    ],
    limits: ['无审批流与行业包', '不可商用'],
  },
  {
    id: 'c_plus',
    name: '创作者版 Plus',
    range: '¥39/开发者/月',
    desc: '独立开发者 / 3 人内小团队',
    segment: 'c',
    featured: true,
    tag: '推荐个人',
    cta: 'buy',
    ctaLabel: '立即购买',
    features: [
      '应用数量不限',
      '对话改页不限',
      '智能出页不限',
      '代码下载不限',
    ],
    limits: ['无企业组织管理', '禁止规模化商用'],
  },
  {
    id: 'b_business',
    name: '商业版 Business',
    range: '¥148/开发者/月',
    desc: '企业团队 / 正式业务系统',
    segment: 'b',
    cta: 'sales',
    ctaLabel: '咨询销售',
    features: [
      '应用上限 50 个',
      'AI 出页 2000 次/月共享',
      '企业组织与权限管理',
      '审批流与行业模板包',
      '操作日志与基础支持',
      '完整商用授权',
    ],
  },
  {
    id: 'b_enterprise',
    name: '企业版 Enterprise',
    range: '定制',
    desc: '私有化部署 / 定制集成',
    segment: 'b',
    cta: 'enterprise',
    ctaLabel: '申请方案',
    features: [
      '私有化 / 混合部署',
      '资源额度无上限',
      'SSO 单点登录',
      '专属客户成功经理',
      '等保合规支持',
      '深度系统集成',
    ],
  },
]

export const PRICING_C_TIERS = PRICING_TIERS.filter((t) => t.segment === 'c')
export const PRICING_B_TIERS = PRICING_TIERS.filter((t) => t.segment === 'b')
/** @deprecated 部署已并入 Enterprise 能力说明 */
export const PRICING_DEPLOY_TIERS: PricingTier[] = []

export const PRICING_FAQ: PricingFaq[] = [
  {
    q: '四档套餐怎么选？',
    a: '试用选 Free；个人/≤3 人小团队开发选 Plus；正式业务与商用选 Business；私有化与等保选 Enterprise。',
  },
  {
    q: 'Plus 能商用吗？',
    a: 'Plus 禁止规模化商用，仅限独立开发者或 ≤3 人微型团队自用/原型。企业对外业务请选 Business 及以上。',
  },
  {
    q: `什么是「${COMPOSE_EDIT_LABEL}」？`,
    a: `${COMPOSE_EDIT_HINT}。从能力目录点选正式模块并发布，不占用对话改页次数。`,
  },
  {
    q: `什么是「${SMART_PAGE_LABEL}」？`,
    a: `${SMART_PAGE_HINT}。与「对话改页」不同：后者改现有菜单/表单，前者是 AI 从零做整页。`,
  },
  {
    q: 'Free「对话改页 10 次/天」够用吗？',
    a: '够完成试用与微调。每天成功改动满 10 次后需等次日或升 Plus（不限）。',
  },
  {
    q: `Free「${SMART_PAGE_LABEL} 1 次/天」是什么意思？`,
    a: '每天可用 AI 生成（或整页修订）1 个可交互页面。选型现成正式能力、用对话改页调表单，都不占这 1 次。',
  },
  {
    q: 'Business 的「AI 出页 2000 次/月」如何计？',
    a: '按组织共享按月累计；对话改页在 Business 不限。点选正式能力不占 AI 出页次数。',
  },
  {
    q: '如何获取专属报价？',
    a: 'Business 可在线咨询或预约演示；Enterprise 私有化/等保请申请方案，顾问按场景出书面报价。',
  },
]
