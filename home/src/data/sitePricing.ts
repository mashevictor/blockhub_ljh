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
export const SMART_PAGE_HINT = '按需求自动生成可运行页面，支持在现有版本上二次修订'

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'c_free',
    name: 'Free 体验',
    range: '¥0',
    segment: 'c',
    features: [
      '最多 10 个应用',
      '对话改页 10 次/天',
      `${SMART_PAGE_LABEL} 1 次/天`,
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
      '对话改页不限',
      `${SMART_PAGE_LABEL}不限（含二次修订）`,
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
      '对话改页不限 · 智能出页共享配额',
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
      `${SMART_PAGE_LABEL} 1000 次/月（共享）`,
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
      `${SMART_PAGE_LABEL}与下载按合同`,
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
    q: `什么是「${SMART_PAGE_LABEL}」？`,
    a: `${SMART_PAGE_HINT}。注册表内正式能力的选型发布不占用该次数；仅「从需求生成可运行页」及二次修订计次。`,
  },
  {
    q: 'Free 对话改页 10 次/天够用吗？',
    a: '够完成试用与微调。重度改页请升 Plus（不限）。确定性选型发布不占对话改页次数。',
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
