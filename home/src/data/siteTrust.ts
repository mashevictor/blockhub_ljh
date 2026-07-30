/** B2B 官网 · 信任与合规资料（真 PDF：home/public/downloads/*.pdf；英文：downloads/en-US/*.pdf） */

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
    title: '积木仓 BlockHub 信息安全白皮书',
    description: '企业评估版 · 数据驻留 · 加密与访问控制 · 删除承诺',
    downloadPath: '/downloads/security-whitepaper.pdf',
  },
  {
    id: 'integration',
    title: '积木仓企业系统集成清单',
    description: 'ERP / CRM / IM / SSO · 对接方式 · 实施周期',
    downloadPath: '/downloads/integration-checklist.pdf',
  },
  {
    id: 'dpa',
    title: '数据处理协议（DPA）核心条款摘要',
    description: '处理目的 · 子处理器 · 境内存储 · 安全义务',
    downloadPath: '/downloads/dpa-summary.pdf',
  },
  {
    id: 'deployment',
    title: '积木仓部署模式对照说明',
    description: 'PaaS · 混合 · 私有化 · 网络边界与运维责任',
    downloadPath: '/downloads/deployment-modes.pdf',
  },
  {
    id: 'security-faq',
    title: '企业安全问卷答复手册（预填版）',
    description: '常见问卷框架 · 预填样例 · 适用边界说明',
    downloadPath: '/downloads/security-faq.pdf',
  },
  {
    id: 'audit-log',
    title: '操作审计日志样例与留存策略',
    description: '字段规范 · 留存周期 · 导出与 SIEM 说明',
    downloadPath: '/downloads/audit-log-sample.pdf',
  },
]

export const TRUST_FAQ_SAMPLES = [
  '客户数据会不会用于模型训练？',
  '删数据流程是什么？',
  '是否支持私有化部署？',
  '等保二级如何对齐？',
]

export const TRUST_STRIP_DOWNLOADS = TRUST_DOCS.slice(0, 3)
