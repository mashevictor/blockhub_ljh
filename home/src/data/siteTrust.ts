/** B2B 官网 · 信任与合规资料 */

export interface TrustDoc {
  id: string
  title: string
  description: string
  downloadPath: string
}

export const TRUST_HERO = {
  title: '安全 · 合规 · 架构 · 可审计',
  desc: '信息部门过审一站式：数据流图、部署方式、对接清单、安全问卷预填、操作日志样例',
}

export const TRUST_DOCS: TrustDoc[] = [
  {
    id: 'security-whitepaper',
    title: '安全白皮书',
    description: '数据流与存储 · 加密与访问控制 · 30 天删除承诺',
    downloadPath: '/downloads/security-whitepaper.html',
  },
  {
    id: 'integration',
    title: '系统集成清单',
    description: '用友 / 金蝶 / 钉钉 / 企业微信等常见对接说明',
    downloadPath: '/downloads/integration-checklist.html',
  },
  {
    id: 'dpa',
    title: '数据处理协议摘要',
    description: 'DPA 核心条款 · 子处理器说明 · 境内存储',
    downloadPath: '/downloads/dpa-summary.html',
  },
  {
    id: 'deployment',
    title: '部署模式对比',
    description: 'PaaS / 混合 / 私有化 · 网络边界与运维责任',
    downloadPath: '/downloads/deployment-modes.html',
  },
  {
    id: 'security-faq',
    title: '安全常见问题答复（预填版）',
    description: '50 题常见问卷 · 42 题预填 · 带来源说明',
    downloadPath: '/downloads/security-faq.html',
  },
  {
    id: 'audit-log',
    title: '操作日志样例',
    description: '审计字段说明 · 留存策略 · 导出方式',
    downloadPath: '/downloads/audit-log-sample.html',
  },
]

export const TRUST_FAQ_SAMPLES = [
  '客户数据会不会用于模型训练？',
  '删数据流程是什么？',
  '是否支持私有化部署？',
  '等保二级如何对齐？',
]

export const TRUST_STRIP_DOWNLOADS = TRUST_DOCS.slice(0, 3)
