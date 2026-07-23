/** 金融五垂直 Runtime 预览场景（与 backend finance_vertical_capabilities 对齐） */

export type FinanceSceneSeed = {
  id: string
  name: string
  category: string
  summary: string
  pages: string
  kind: string
  capabilityHint: string
}

function seeds(
  pack: string,
  rows: Array<[string, string, string, string, string]>,
): FinanceSceneSeed[] {
  return rows.map((r, i) => ({
    id: `${pack}-s${i + 1}`,
    name: r[0],
    category: r[1],
    summary: r[2],
    pages: r[3],
    kind: 'understood',
    capabilityHint: r[4],
  }))
}

export const BANK_SCENE_SEEDS = seeds('bank', [
  ['对公开户 KYC', '对公业务', '对公客户开户身份核验', 'form+list', 'finance_kyc'],
  ['零售开户 KYC', '零售业务', '个人客户开户核验', 'form+list', 'finance_kyc'],
  ['授信审批', '信贷业务', '授信额度/担保审批', 'form+list', 'credit_approval'],
  ['反洗钱监测', '合规管理', '可疑交易识别上报', 'form+list', 'finance_aml'],
  ['合规审查', '合规管理', '业务合规自检会签', 'approval+kb', 'approval_flow'],
  ['银行·合规与反洗钱库', '行业知识库', 'KYC/AML/授信制度 RAG', 'kb+chat', 'kb_document'],
  ['银行·产品与信贷说明库', '行业知识库', '对公/零售产品口径', 'kb+chat', 'kb_document'],
  ['风险经营看板', '数据分析', 'KYC/AML/授信真计数', 'chart', 'chart_dashboard'],
])

export const SECURITIES_SCENE_SEEDS = seeds('securities', [
  ['开户适当性', '开户业务', '投资者适当性评估', 'form+list', 'finance_kyc'],
  ['投研尽调', '投研业务', '标的尽调报告', 'form+list', 'due_diligence'],
  ['合规审查', '合规管理', '业务合规会签', 'approval+kb', 'approval_flow'],
  ['产品销售', '产品业务', '理财销售与说明', 'kb+chat', 'kb_document'],
  ['反洗钱监测', '合规管理', '异常交易监测', 'form+list', 'finance_aml'],
  ['券商·合规库', '行业知识库', '适当性/合规 RAG', 'kb+chat', 'kb_document'],
  ['券商·产品投研库', '行业知识库', '产品与投研口径', 'kb+chat', 'kb_document'],
  ['经营看板', '数据分析', '金融真计数聚合', 'chart', 'chart_dashboard'],
])

export const INSURANCE_SCENE_SEEDS = seeds('insurance', [
  ['核保', '承保业务', '核保评估工单', 'form+list', 'insurance_case'],
  ['理赔', '理赔业务', '报案赔付工单', 'form+list', 'insurance_case'],
  ['代理人合规', '渠道管理', '展业合规审查', 'approval+kb', 'approval_flow'],
  ['产品说明', '产品业务', '条款说明书问答', 'kb+chat', 'kb_document'],
  ['保险·合规库', '行业知识库', '核保理赔合规 RAG', 'kb+chat', 'kb_document'],
  ['保险·产品条款库', '行业知识库', '产品条款口径', 'kb+chat', 'kb_document'],
  ['经营看板', '数据分析', '核保理赔真计数', 'chart', 'chart_dashboard'],
])

export const FUND_SCENE_SEEDS = seeds('fund', [
  ['产品披露', '产品业务', '披露材料检索', 'kb+chat', 'kb_document'],
  ['投后管理', '投后业务', '投后纪要归档', 'form+list', 'due_diligence'],
  ['监管报送', '合规管理', '报送任务办结', 'form+list', 'regulatory_report'],
  ['合规审查', '合规管理', '披露合规会签', 'approval+kb', 'approval_flow'],
  ['资管·合规库', '行业知识库', '报送/合规 RAG', 'kb+chat', 'kb_document'],
  ['资管·产品披露库', '行业知识库', '产品披露口径', 'kb+chat', 'kb_document'],
  ['经营看板', '数据分析', '金融真计数聚合', 'chart', 'chart_dashboard'],
])

export const FINTECH_SCENE_SEEDS = seeds('fintech', [
  ['风控预警', '风控业务', '欺诈/逾期预警', 'form+list', 'finance_aml'],
  ['贷后管理', '贷后业务', '贷后检查工单', 'form+list', 'credit_approval'],
  ['监管报送', '合规管理', '消金报送任务', 'form+list', 'regulatory_report'],
  ['开户 KYC', '获客业务', '消金开户核验', 'form+list', 'finance_kyc'],
  ['消金·合规库', '行业知识库', '风控/报送 RAG', 'kb+chat', 'kb_document'],
  ['消金·产品贷后库', '行业知识库', '产品与贷后口径', 'kb+chat', 'kb_document'],
  ['经营看板', '数据分析', '金融真计数聚合', 'chart', 'chart_dashboard'],
  ['合规审查', '合规管理', '业务合规会签', 'approval+kb', 'approval_flow'],
])
