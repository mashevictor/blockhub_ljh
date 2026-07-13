/** B2B 官网 · 定价框架 */

export interface PricingTier {
  id: string
  name: string
  range: string
  features: string[]
  featured?: boolean
}

export interface PricingFaq {
  q: string
  a: string
}

export const PRICING_INTRO =
  '不写死价格 · 说明影响因素 · 大多数制造/零售客户首年 80–150 万 · 预约后提供专属报价说明'

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'paas',
    name: 'PaaS 标准',
    range: '按坐席',
    features: ['快速上线', '标准集成', '适合 50 人以下团队试点'],
  },
  {
    id: 'hybrid',
    name: '混合部署',
    range: '80–120万/年',
    features: ['业务系统对接', '数据不出境', '专属技术支持'],
    featured: true,
  },
  {
    id: 'private',
    name: '私有化',
    range: '定制报价',
    features: ['等保对齐', '专属智能体', '本地运维可选'],
  },
]

export const PRICING_FAQ: PricingFaq[] = [
  {
    q: '价格由哪些因素决定？',
    a: '坐席数量、部署方式（PaaS/混合/私有化）、集成复杂度、是否需要定制能力与专属 SLA。',
  },
  {
    q: '有没有隐藏费用？',
    a: '标准报价包含平台使用、标准集成与基础技术支持。超出范围的定制开发、驻场与等保测评等单独评估。',
  },
  {
    q: '付款方式？',
    a: '企业客户常见 30/40/30 里程碑付款：签约预付、试点验收、年度续费。',
  },
  {
    q: '试点阶段如何收费？',
    a: '7–14 天试点通常包含在商务方案内，或按小型 POC 套餐单独报价，试点通过后抵扣首年合同。',
  },
  {
    q: '续费如何计算？',
    a: '按合同坐席数与活跃使用量综合评估，老客户享有版本升级与新增场景打包优惠。',
  },
  {
    q: '如何获取专属报价？',
    a: '预约演示后，顾问将根据您的场景、集成需求与部署方式提供书面报价框架与一页纸方案摘要。',
  },
]
