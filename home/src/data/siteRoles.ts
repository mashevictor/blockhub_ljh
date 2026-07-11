/** B2B 官网 · 角色入口页 /for/:role */

export type RolePageKey = 'sales-ops' | 'it' | 'finance' | 'procurement'

export interface RoleDownload {
  title: string
  path: string
}

export interface RolePage {
  key: RolePageKey
  title: string
  subtitle: string
  topQuestions: string[]
  downloads: RoleDownload[]
  cta: string
}

export const ROLE_PAGES: RolePage[] = [
  {
    key: 'sales-ops',
    title: '销售与运营同事',
    subtitle: '快速响应、内部转发、试点验收材料',
    topQuestions: [
      '一线销售为什么愿意用？',
      '平均首响能缩短多少？',
      '有没有同行业制造案例？',
      '试点要多长时间？',
      '如何向老板汇报 ROI？',
    ],
    downloads: [
      { title: '制造行业客户案例', path: '/cases/mfg-leads' },
      { title: '一页纸方案摘要', path: '/downloads/one-pager-mfg.html' },
      { title: '价格与套餐说明', path: '/pricing' },
    ],
    cta: '预约演示 · 获取可转发材料包',
  },
  {
    key: 'it',
    title: '信息部门同事',
    subtitle: '安全预审、集成对接、部署方式',
    topQuestions: [
      '数据存在哪里？会不会出境？',
      '如何对接现有 CRM/ERP？',
      'SaaS 和私有化怎么选？',
      '安全问卷有没有预填版？',
      '操作日志能否导出审计？',
    ],
    downloads: [
      { title: '安全白皮书', path: '/downloads/security-whitepaper.html' },
      { title: '系统集成清单', path: '/downloads/integration-checklist.html' },
      { title: '信任与合规中心', path: '/trust' },
    ],
    cta: '进入信任与合规中心',
  },
  {
    key: 'finance',
    title: '财务同事',
    subtitle: '预算框架、付款方式、TCO 说明',
    topQuestions: [
      '首年大概多少预算？',
      '按坐席还是按项目？',
      '付款里程碑怎么安排？',
      '续费涨幅如何约定？',
      '有没有总拥有成本说明？',
    ],
    downloads: [
      { title: '定价框架说明', path: '/pricing' },
      { title: '一页纸方案摘要', path: '/downloads/one-pager-mfg.html' },
    ],
    cta: '查看定价说明',
  },
  {
    key: 'procurement',
    title: '采购同事',
    subtitle: '招标资质、SLA、合同条款',
    topQuestions: [
      '是否支持招标所需资质材料？',
      'SLA 如何承诺？',
      '数据处理协议是否标准？',
      '能否提供参考合同样本？',
      '供应商准入需要哪些文件？',
    ],
    downloads: [
      { title: 'DPA 摘要', path: '/downloads/dpa-summary.html' },
      { title: '部署模式对比', path: '/downloads/deployment-modes.html' },
      { title: '定价与 SLA 说明', path: '/pricing' },
    ],
    cta: '预约演示 · 获取资质包',
  },
]

export function getRolePage(key: string): RolePage | undefined {
  return ROLE_PAGES.find((r) => r.key === key)
}
