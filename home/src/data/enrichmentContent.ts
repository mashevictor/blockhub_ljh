/** 信任资料正文 · DeepSeek 合成（scripts/generate-enrichment-docs.py） */

import { sectionsToBlocks, type EnrichBlock, type EnrichLinkItem, type EnrichSection } from './enrichBlocks'

export interface TrustDocArticle {
  id: string
  title: string
  subtitle: string
  downloadPath: string
  sections: EnrichSection[]
  relatedLinks: EnrichLinkItem[]
}

export const TRUST_DOC_ARTICLES: Record<string, TrustDocArticle> = {
  'security-whitepaper': {
    id: 'security-whitepaper',
    title: `安全白皮书`,
    subtitle: `数据流与存储 · 加密与访问控制 · 30 天删除承诺`,
    downloadPath: '/downloads/security-whitepaper.html',
    sections: [
      { heading: `文档说明`, paragraphs: [`本白皮书面向企业信息部门与安全团队，概述积木仓 BlockHub 在数据存储、传输加密、访问控制与删除承诺方面的实践。`,
          `内容可与 [信任与合规中心](/trust) 在线资料对照；如需完整 DPA 与等保对齐说明，请 [预约演示](/#contact-demo) 获取资质包。`] },
      { heading: `数据存储与出境`, paragraphs: [`客户业务数据（应用配置、知识库文档、业务表单等）默认存储于**中国大陆境内**数据中心。`,
          `未经客户书面授权，客户数据**不会用于**大模型训练、也不会向第三方营销共享。`,
          `跨境访问需客户明确开通并签署补充条款；默认关闭境外管理员登录。`] },
      { heading: `传输与加密`, paragraphs: [`管理端与员工端全链路 **HTTPS/TLS 1.2+**；API 调用支持 mTLS（混合/私有化可选）。`,
          `静态数据采用 **AES-256** 加密存储；密钥由云 KMS 或客户 HSM 托管（私有化可选）。`,
          `敏感字段（手机号、身份证等）支持列级脱敏展示与导出控制。`] },
      { heading: `访问控制与审计`, paragraphs: [`基于角色的权限管理（RBAC），支持组织/部门/门店多级隔离。`,
          `关键操作（登录、权限变更、数据导出、智能体发布）**全量操作日志**留存，默认 180 天，可延长至 1 年。`,
          `支持 CSV/JSON 导出，字段说明见 [操作日志样例](/trust/audit-log)。`] },
      { heading: `删除与退出`, paragraphs: [`合同终止或客户书面请求后 **30 个自然日内**完成数据删除，并提供删除确认函。`,
          `备份卷按滚动策略清除；子处理器同步删除确认可一并提供。`] },
    ],
    relatedLinks: [
      { label: `返回信任与合规中心`, href: `/trust` },
      { label: `信任与合规中心`, href: `/trust` },
      { label: `落地案例`, href: `/cases` },
      { label: `定价说明`, href: `/pricing` },
      { label: `预约演示`, href: `/#contact-demo` },
    ],
  },
  'integration': {
    id: 'integration',
    title: `系统集成清单`,
    subtitle: `用友 / 金蝶 / 钉钉 / 企业微信等常见对接说明`,
    downloadPath: '/downloads/integration-checklist.html',
    sections: [
      { heading: `集成原则`, paragraphs: [`积木仓采用「标准 API + 可选 Webhook」与现有 ERP/CRM/OA 对接，避免替换核心系统。`,
          `常见模式：只读同步主数据、线索/工单双向同步、单点登录（SSO）、消息通知回写。`] },
      { heading: `已验证系统`, paragraphs: [`**ERP/财务**：用友 U8/YonBIP、金蝶云星空（REST/中间表；Adapter 按签约）。`,
          `**CRM**：自建 CRM Webhook + HMAC（已落地）；纷享销客、销售易（字段模板扩展）。`,
          `**协同**：钉钉、企业微信、飞书群机器人消息推送（已落地）；通讯录全量可扩展。`,
          `**身份**：企业微信 OAuth 扫码骨架；Azure AD、LDAP（私有化）。`] },
      { heading: `工程接口`, paragraphs: [`入站：\`POST /api/v1/integrations/ingress/webhook\`（HMAC）。`,
          `IM 探测：\`POST /api/v1/integrations/{id}/test-message\`。`,
          `企微 SSO：\`GET /api/v1/auth/oauth/wecom/start\`。可下载 [系统集成清单](/downloads/integration-checklist.html)。`] },
      { heading: `典型对接场景`, paragraphs: [`制造：CRM 新线索 → 积木仓智能体草拟话术 → 销售确认后回写跟进记录。`,
          `零售：HR 制度 PDF → 知识库 → 门店员工自然语言问答。`,
          `物流：TMS 运单状态 API → 智能体 7×24 查询与异常推送。`] },
      { heading: `实施周期`, paragraphs: [`标准 REST 对接：**5–10 个工作日**（含联调与 UAT）。`,
          `复杂 ERP 中间表：**2–4 周**；需客户方 DBA/集成商配合。`,
          `详细接口清单与字段映射模板可在 [预约演示](/#contact-demo) 后获取。`] },
    ],
    relatedLinks: [
      { label: `返回信任与合规中心`, href: `/trust` },
      { label: `信任与合规中心`, href: `/trust` },
      { label: `落地案例`, href: `/cases` },
      { label: `定价说明`, href: `/pricing` },
      { label: `预约演示`, href: `/#contact-demo` },
    ],
  },
  'dpa': {
    id: 'dpa',
    title: `数据处理协议摘要`,
    subtitle: `DPA 核心条款 · 子处理器说明 · 境内存储`,
    downloadPath: '/downloads/dpa-summary.html',
    sections: [
      { heading: `协议范围`, paragraphs: [`本摘要为积木仓标准数据处理协议（DPA）的核心条款概览，适用于 SaaS/PaaS/混合/私有化各部署模式。`,
          `正式签约以双方盖章版为准；采购与法务可在 [信任与合规中心](/trust) 索取完整模板。`] },
      { heading: `处理目的与类别`, paragraphs: [`处理目的：提供智能体应用托管、知识库检索、多端发布与运维支持。`,
          `数据类别：企业提供的业务文本、表单、日志及必要的员工账号信息。`,
          `处理者角色：积木仓为**受托处理者**；客户为控制者。`] },
      { heading: `子处理器`, paragraphs: [`基础设施：境内云厂商（计算/存储/网络）。`,
          `可选：短信/邮件网关、客户指定的 LLM API（如 DeepSeek）——仅在客户开启相关能力时调用。`,
          `子处理器清单与变更通知机制见完整 DPA 附录。`] },
      { heading: `境内存储与安全措施`, paragraphs: [`默认境内存储；加密、访问控制与审计要求见 [安全白皮书](/trust/security-whitepaper)。`,
          `客户可要求年度安全评估摘要或渗透测试报告（NDA 前提下）。`] },
    ],
    relatedLinks: [
      { label: `返回信任与合规中心`, href: `/trust` },
      { label: `信任与合规中心`, href: `/trust` },
      { label: `落地案例`, href: `/cases` },
      { label: `定价说明`, href: `/pricing` },
      { label: `预约演示`, href: `/#contact-demo` },
    ],
  },
  'deployment': {
    id: 'deployment',
    title: `部署模式对比`,
    subtitle: `PaaS / 混合 / 私有化 · 网络边界与运维责任`,
    downloadPath: '/downloads/deployment-modes.html',
    sections: [
      { heading: `选型概览`, paragraphs: [`积木仓提供 **PaaS 标准 / 混合部署 / 私有化** 三档，匹配不同数据敏感度与 IT 能力。`,
          `建议路径：PaaS 试点验证场景 → 混合部署固化集成 → 私有化满足等保/行业监管（如需要）。`] },
      { heading: `PaaS 标准`, paragraphs: [`应用与元数据托管在积木仓境内集群；**最快 5 分钟**完成首场景配置。`,
          `适合 50 人以下试点、PoC 或对 IT 依赖较小的团队。`,
          `按坐席订阅；标准集成与基础技术支持包含在报价内。`] },
      { heading: `混合部署`, paragraphs: [`应用控制面在积木仓，**业务数据与客户知识库**存客户 VPC 或本地数据库。`,
          `适合中型企业、数据不出境要求、需对接内网 ERP/CRM 的客户。`,
          `首年参考区间见 [定价说明](/pricing)。`] },
      { heading: `私有化`, paragraphs: [`全栈部署于客户机房或专属云；支持等保二级对齐与专属 SLA。`,
          `适合金融、政务、大型制造等监管要求高或需本地运维的场景。`,
          `定制报价；含实施、培训与可选驻场。`] },
    ],
    relatedLinks: [
      { label: `返回信任与合规中心`, href: `/trust` },
      { label: `信任与合规中心`, href: `/trust` },
      { label: `落地案例`, href: `/cases` },
      { label: `定价说明`, href: `/pricing` },
      { label: `预约演示`, href: `/#contact-demo` },
    ],
  },
  'security-faq': {
    id: 'security-faq',
    title: `安全常见问题答复（预填版）`,
    subtitle: `50 题常见问卷 · 42 题预填 · 带来源说明`,
    downloadPath: '/downloads/security-faq.html',
    sections: [
      { heading: `使用说明`, paragraphs: [`以下为常见 50 题安全问卷中的 **42 题预填样例**（节选展示）。正式版含来源页码，可在演示后索取 Word/PDF。`,
          `在线提问：各子站智能体助手支持引用本资料作答。`] },
      { heading: `数据与模型`, paragraphs: [`**Q：客户数据是否用于模型训练？** A：否。默认不用于训练；可选 LLM 调用仅处理当次请求。`,
          `**Q：是否支持私有化大模型？** A：支持对接客户内网或指定 API（混合/私有化）。`,
          `**Q：删数据流程？** A：书面申请 → 30 天内删除 → 提供删除确认函。`] },
      { heading: `部署与合规`, paragraphs: [`**Q：是否支持等保二级？** A：混合/私有化可参考等保二级控制项对齐；提供差距分析与整改建议。`,
          `**Q：日志留存多久？** A：默认 180 天，可配置至 1 年；见 [操作日志样例](/trust/audit-log)。`,
          `**Q：是否提供渗透测试报告？** A：年度摘要可向签约客户提供（NDA）。`] },
    ],
    relatedLinks: [
      { label: `返回信任与合规中心`, href: `/trust` },
      { label: `信任与合规中心`, href: `/trust` },
      { label: `落地案例`, href: `/cases` },
      { label: `定价说明`, href: `/pricing` },
      { label: `预约演示`, href: `/#contact-demo` },
    ],
  },
  'audit-log': {
    id: 'audit-log',
    title: `操作日志样例`,
    subtitle: `审计字段说明 · 留存策略 · 导出方式`,
    downloadPath: '/downloads/audit-log-sample.html',
    sections: [
      { heading: `审计范围`, paragraphs: [`操作日志覆盖管理后台与关键 API：登录/登出、权限变更、应用发布、数据导出、智能体配置变更等。`,
          `日志用于安全审计、问题追溯与合规检查，**不可被普通管理员篡改**。`] },
      { heading: `字段说明（样例）`, paragraphs: [`\`timestamp\` 操作时间（UTC+8）；\`actor\` 操作人账号；\`action\` 动作类型；\`resource\` 对象 ID；\`ip\` 来源 IP；\`result\` 成功/失败；\`detail\` JSON 扩展。`,
          `示例：\`2026-07-08 14:32:01 | zhangsan | app.publish | app_8f3a | 10.0.1.22 | success | version=1.2.0\``] },
      { heading: `留存与导出`, paragraphs: [`默认留存 **180 天**；金融/政务客户可延长至 365 天（混合/私有化）。`,
          `支持按时间范围、操作人、动作类型筛选导出 CSV/JSON。`,
          `SIEM 对接：Syslog/Webhook（私有化可选）。`] },
    ],
    relatedLinks: [
      { label: `返回信任与合规中心`, href: `/trust` },
      { label: `信任与合规中心`, href: `/trust` },
      { label: `落地案例`, href: `/cases` },
      { label: `定价说明`, href: `/pricing` },
      { label: `预约演示`, href: `/#contact-demo` },
    ],
  },
}

export function getTrustDocArticle(id: string): TrustDocArticle | undefined {
  return TRUST_DOC_ARTICLES[id]
}

export function resolveTrustDocBlocks(id: string): EnrichBlock[] {
  const doc = getTrustDocArticle(id)
  if (!doc) return []
  return sectionsToBlocks(doc.sections, { relatedLinks: doc.relatedLinks })
}
