/** B2B 官网 · 定价（C 端 Free/Plus + B 端 Team/Business/Enterprise） */

export interface PricingTier {
  id: string
  name: string
  range: string
  segment: 'c' | 'b' | 'deploy'
  features: string[]
  featured?: boolean
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

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'c_free',
    name: 'Free 体验',
    range: '¥0',
    segment: 'c',
    features: [
      '最多 10 个应用',
      '对话改页 10 次/天：聊天改菜单与表单',
      `${SMART_PAGE_LABEL} 1 次/天：AI 生成整页可运行界面`,
      '可下载 1 个项目代码',
      '全量标准能力选型',
    ],
  },
  {
    id: 'c_plus',
    name: 'Plus 创作者',
    range: '¥39/人·月',
    segment: 'c',
    featured: true,
    features: [
      '应用数不限',
      '对话改页不限：聊天改菜单与表单',
      `${SMART_PAGE_LABEL}不限：AI 生成/修订整页`,
      '项目代码下载不限',
      '品牌色 / Plaza 发布',
    ],
  },
  {
    id: 'b_team',
    name: 'Team 团队',
    range: '¥98/坐席·月',
    segment: 'b',
    features: [
      '起购 5 席 · 应用 10 个',
      '行业包 1 个',
      '对话改页不限 · 智能出页组织共享（改表单 vs AI 整页）',
      '契约下载 10 次/月 · APK 4 次/月',
      '知识库 1 GB',
    ],
  },
  {
    id: 'b_business',
    name: 'Business 商业',
    range: '¥168/坐席·月',
    segment: 'b',
    featured: true,
    features: [
      '起购 10 席 · 改页审批流',
      '应用 50 个 · 行业包 5 个',
      `${SMART_PAGE_LABEL} 1000 次/月（共享）：AI 整页生成/修订`,
      '契约下载 30 次/月 · APK 20 次/月',
      '知识库 10 GB · 标准 IM Webhook',
    ],
  },
  {
    id: 'b_enterprise',
    name: 'Enterprise 企业',
    range: '合同制',
    segment: 'b',
    features: [
      '混合部署参考 80–120 万/年',
      '私有化 / 等保 / SSO / 审计',
      'ERP·OA 深度集成 · 专属 SLA',
      `对话改页与${SMART_PAGE_LABEL}按合同`,
      '白标与专属构建队列',
    ],
  },
  {
    id: 'deploy_hybrid',
    name: '混合部署',
    range: '80–120万/年',
    segment: 'deploy',
    features: ['业务数据可落客户 VPC', '对接实施单列', '专属技术支持'],
  },
  {
    id: 'deploy_private',
    name: '私有化',
    range: '定制报价',
    segment: 'deploy',
    features: ['等保对齐', '本地运维可选', '专属智能体'],
  },
]

export const PRICING_C_TIERS = PRICING_TIERS.filter((t) => t.segment === 'c')
export const PRICING_B_TIERS = PRICING_TIERS.filter((t) => t.segment === 'b')
export const PRICING_DEPLOY_TIERS = PRICING_TIERS.filter((t) => t.segment === 'deploy')

export const PRICING_FAQ: PricingFaq[] = [
  {
    q: 'C 端和 B 端有什么区别？',
    a: 'C 端面向个人创作者（Free / Plus），按人计费；B 端面向组织，按坐席计费，含行业包、审批流、APK 与混合/私有化。',
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
    a: '够完成试用与微调（例如改几个字段、加一个审批页）。每天成功改动满 10 次后需等次日或升 Plus（不限）。',
  },
  {
    q: `Free「${SMART_PAGE_LABEL} 1 次/天」是什么意思？`,
    a: '每天可用 AI 生成（或整页修订）1 个可交互页面。选型现成正式能力、用对话改页调表单，都不占这 1 次。',
  },
  {
    q: '价格由哪些因素决定？',
    a: 'C/B 档位、坐席数、部署方式（公有云/混合/私有化）、集成复杂度、是否需要定制与专属 SLA。',
  },
  {
    q: '付款方式？',
    a: 'C 端支持按月/年付；企业客户常见 30/40/30 里程碑：签约预付、试点验收、年度续费。',
  },
  {
    q: '如何获取专属报价？',
    a: '预约演示后，顾问将根据场景、集成与部署方式提供书面报价框架。',
  },
]
