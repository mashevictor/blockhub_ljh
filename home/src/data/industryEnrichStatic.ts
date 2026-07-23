/**
 * 行业独立站第一版 enrichment（与后端 industry_enrich_static 同源思路）
 * API 不可用时仍可展示 overview / CapShip 模块 / scene_tips
 */

export interface ClientSceneTip {
  name: string
  tip: string
}

export interface ClientIndustryEnrichment {
  overview: string
  highlights: string[]
  recommended_modules: string[]
  scene_tips: ClientSceneTip[]
  source: 'static'
}

const PACK_CAPSHIP: Record<string, string[]> = {
  office: ['leave_request', 'expense_claim', 'policy_qa', 'hire_onboard', 'chat_qa', 'approval_inbox', 'seal_request', 'meeting_booking', 'approval_flow', 'ops_kpi', 'kb_document', 'it_ticket', 'asset_manage', 'notify_im', 'notify_inapp', 'chart_dashboard', 'data_nl_query', 'legal_case', 'erp_connector', 'rbac_page', 'shift_attendance'],
  mfg: ['device_repair', 'quality_inspect', 'inventory_count', 'chat_qa', 'notify_im', 'kb_document'],
  sales: ['sales_lead', 'quote_contract', 'ops_kpi', 'chat_qa', 'chart_funnel', 'notify_im', 'kb_document', 'expense_claim', 'site_patrol', 'erp_connector', 'campaign_ops', 'data_nl_query', 'chart_dashboard'],
  med: ['med_triage', 'nurse_shift', 'kb_document', 'chat_qa', 'approval_flow', 'notify_im'],
  game: ['game_support', 'game_2048', 'kb_document', 'notify_im', 'approval_flow', 'chart_dashboard', 'data_nl_query', 'erp_connector'],
  retail: ['inventory_count', 'member_loyalty', 'chat_qa', 'notify_im', 'approval_flow', 'chart_dashboard'],
  edu: ['school_notice', 'homework_qa', 'class_schedule', 'chat_qa', 'notify_im', 'kb_document'],
  bank: ['finance_kyc', 'finance_aml', 'credit_approval', 'approval_flow', 'kb_document', 'chat_qa', 'chart_dashboard', 'notify_im'],
  securities: ['finance_kyc', 'due_diligence', 'approval_flow', 'kb_document', 'chat_qa', 'chart_dashboard', 'notify_im', 'finance_aml'],
  insurance: ['insurance_case', 'approval_flow', 'kb_document', 'chat_qa', 'notify_im', 'chart_dashboard'],
  fund: ['regulatory_report', 'due_diligence', 'kb_document', 'approval_flow', 'chat_qa', 'chart_dashboard', 'notify_im'],
  fintech: ['finance_aml', 'credit_approval', 'regulatory_report', 'finance_kyc', 'kb_document', 'chart_dashboard', 'notify_im', 'chat_qa'],
  logistics: [
    'waybill_track',
    'warehouse_inbound',
    'warehouse_outbound',
    'inventory_count',
    'fleet_dispatch',
    'pod_signoff',
    'logistics_exception',
    'route_task',
    'freight_settle',
    'cold_chain_alert',
    'dock_queue',
    'delivery_order',
    'notify_im',
    'approval_flow',
    'chart_dashboard',
    'ops_kpi',
    'data_nl_query',
    'kb_document',
    'chat_qa',
  ],
  realestate: [
    'listing_publish',
    'rent_collection',
    'house_viewing',
    'property_repair',
    're_contract',
    'owner_complaint',
    'deco_acceptance',
    'notify_im',
    'chart_dashboard',
    'kb_document',
    'approval_flow',
    'ops_kpi',
    'data_nl_query',
    'deco_material',
    'site_patrol',
  ],
  hotel: ['hotel_booking', 'site_patrol', 'member_loyalty', 'approval_flow', 'notify_im', 'chart_dashboard'],
  energy: ['site_patrol', 'device_repair', 'approval_flow', 'chart_dashboard', 'notify_im', 'kb_document'],
  gov: ['gov_service', 'chat_qa', 'kb_document', 'approval_flow', 'chart_dashboard', 'notify_im'],
  legal: ['legal_case', 'kb_document', 'chat_qa', 'approval_flow', 'notify_im'],
  hr: ['hire_onboard', 'leave_request', 'policy_qa', 'approval_flow', 'kb_document', 'notify_im'],
  marketing: ['campaign_ops', 'sales_lead', 'chart_funnel', 'approval_flow', 'notify_im', 'chat_qa'],
  construction: ['site_patrol', 'deco_material', 'approval_flow', 'notify_im', 'kb_document', 'chart_dashboard'],
  agriculture: ['kb_document', 'approval_flow', 'notify_im', 'chart_dashboard', 'chat_qa'],
  media: ['campaign_ops', 'kb_document', 'approval_flow', 'notify_im', 'chat_qa', 'chart_dashboard'],
  auto: ['device_repair', 'sales_lead', 'chat_qa', 'approval_flow', 'notify_im', 'chart_dashboard'],
}

const PACK_COPY: Record<string, { overview: string; highlights: string[]; tipScenes: Array<{ name: string; tip: string }> }> = {
  office: {
    overview: '通用办公深度包覆盖人事行政、财务法务、知识协同与流程审批，开箱可用请假报销、制度问答与招聘入职等正式能力。',
    highlights: ['请假报销正式能力', '制度问答 + 待办中心', '招聘入职链路', '消息触达'],
    tipScenes: [
      { name: '请假审批', tip: '员工请假在线申请与主管审批；落地 leave_request，可用 >> 增补通知模块。' },
      { name: '报销记账', tip: '费用报销与发票归档；落地 expense_claim，支持附件与多级审批。' },
      { name: '制度问答', tip: '制度政策福利智能问答；落地 policy_qa + 知识库。' },
      { name: '招聘入职', tip: '招聘与入职指引；落地 hire_onboard，可接审批与待办。' },
    ],
  },
  mfg: {
    overview: '传统制造深度包以设备报修、质检 SOP、库存盘点为核心正式能力，让现场报修与工艺问答在手机端闭环。',
    highlights: ['设备报修派工', '质检 SOP', '库存盘点', '安环拍图上报'],
    tipScenes: [
      { name: '设备报修', tip: '产线故障报修派工；落地 device_repair，现场拍照 + 通知闭环。' },
      { name: 'SOP/工艺问答', tip: '作业指导书检索；落地 chat_qa + kb_document。' },
      { name: '质检审批', tip: '来料成品质检；落地 quality_inspect / 审批流。' },
      { name: '物料领用', tip: '生产领退料；可配 inventory_count 与审批。' },
    ],
  },
  sales: {
    overview: '销售深度包只收录销售/CRM 特有场景，不搬用通用办公人事行政；正式能力接真 API，空库空列表。',
    highlights: ['纯销售场景 · 不混办公审批人事', '线索到回款真库闭环', '漏斗与提成看板接真数据', 'Salesforce / 纷享等 CRM 可对接'],
    tipScenes: [
      { name: '线索录入', tip: '新线索快速落库；落地 sales_lead。' },
      { name: '特价折扣', tip: '超权限折扣；落地 quote_contract。' },
      { name: '销售漏斗分析', tip: '阶段转化；落地 chart_funnel。' },
      { name: '拜访纪要', tip: '客户跟进留痕；落地 sales_lead。' },
      { name: '销售合同审批', tip: '销售合同会签；落地 quote_contract。' },
      { name: '外勤签到', tip: '拜访定位；落地 site_patrol。' },
      { name: 'Salesforce线索同步', tip: 'CRM 同步；落地 erp_connector。' },
      { name: '产品话术库', tip: '话术竞品；落地 chat_qa。' },
    ],
  },
  med: {
    overview: '医疗健康深度包覆盖智能导诊、护士排班与临床知识检索，支撑预问诊与调班审批。',
    highlights: ['智能导诊', '护士排班', '诊疗指南', '不良事件闭环'],
    tipScenes: [
      { name: '智能导诊(对外)', tip: '患者预问诊；落地 med_triage。' },
      { name: '排班/调班申请', tip: '医护排班；落地 nurse_shift。' },
      { name: '诊疗指南/药品库', tip: '临床用药参考；落地 kb_document。' },
      { name: '不良事件上报', tip: '医疗安全事件；表单+审批闭环。' },
    ],
  },
  game: {
    overview: '游戏娱乐深度包：玩家 FAQ/客服工单真库、活动规则与版号合规双知识库 RAG、活动 IM 通知、2048 正式可玩；禁止假 seed。',
    highlights: ['玩家 FAQ · 客服工单真 API', '活动规则 / 版号合规双知识库', '活动通知 · IM Webhook', '2048 正式可玩'],
    tipScenes: [
      { name: '玩家FAQ', tip: '活动规则问答；落地 game_support（default_category=faq）。' },
      { name: '客服工单', tip: '玩家问题流转；落地 game_support（ticket）。' },
      { name: '游戏·玩家FAQ与活动规则库', tip: '行业专属知识库 RAG；空库空列表。' },
      { name: '活动上线通知', tip: '开服活动推送；notify_im。' },
    ],
  },
  retail: {
    overview: '零售电商深度包以库存盘点、会员营销为主能力，覆盖补货、积分与门店巡检。',
    highlights: ['库存盘点', '会员营销', '门店巡检', '退换货'],
    tipScenes: [
      { name: '库存预警', tip: '低库存提醒补货；inventory_count + 通知。' },
      { name: '会员营销', tip: '积分促销触达；member_loyalty。' },
      { name: '门店巡检', tip: '陈列卫生拍照；表单+审批。' },
      { name: '退换货处理', tip: '工单流转；审批闭环。' },
    ],
  },
  edu: {
    overview: '教育培训深度包覆盖家校通知、作业答疑与课表查询，提升家校沟通效率。',
    highlights: ['家校通知', '作业答疑', '课表查询', '成绩看板'],
    tipScenes: [
      { name: '家校通知', tip: '通知公告精准推送；school_notice。' },
      { name: '在线答疑', tip: '课后答疑；homework_qa / chat_qa。' },
      { name: '课程排课', tip: '班级课表；class_schedule。' },
      { name: '成绩分析', tip: '成绩趋势预警；chart_dashboard。' },
    ],
  },
  bank: {
    overview: '商业银行垂直包覆盖对公/零售 KYC、授信与反洗钱；正式能力接真 API，空库空列表。',
    highlights: ['KYC 真工单', '授信审批', 'AML 监测', '双知识库'],
    tipScenes: [
      { name: '对公开户 KYC', tip: '企业开户核验；finance_kyc。' },
      { name: '授信审批', tip: '额度担保审批；credit_approval。' },
      { name: '反洗钱监测', tip: '可疑交易工单；finance_aml。' },
      { name: '合规审查', tip: '会签+银行合规库；approval_flow。' },
    ],
  },
  securities: {
    overview: '证券券商垂直包覆盖适当性、投研尽调、合规与产品销售。',
    highlights: ['适当性', '投研尽调', '合规会签', '产品 RAG'],
    tipScenes: [
      { name: '开户适当性', tip: '投资者匹配；finance_kyc。' },
      { name: '投研尽调', tip: '尽调报告；due_diligence。' },
      { name: '产品销售', tip: '说明书问答；kb + chat_qa。' },
      { name: '合规审查', tip: '会签留痕；approval_flow。' },
    ],
  },
  insurance: {
    overview: '保险垂直包覆盖核保、理赔、代理人与产品说明。',
    highlights: ['核保理赔', '代理人合规', '产品条款', '审批留痕'],
    tipScenes: [
      { name: '核保', tip: '承保评估；insurance_case。' },
      { name: '理赔', tip: '报案赔付；insurance_case。' },
      { name: '产品说明', tip: '条款 RAG；kb_document。' },
      { name: '代理人合规', tip: '展业审查；approval_flow。' },
    ],
  },
  fund: {
    overview: '基金资管垂直包覆盖产品披露、投后与监管报送。',
    highlights: ['监管报送', '投后管理', '产品披露', '合规审查'],
    tipScenes: [
      { name: '监管报送', tip: '报送任务；regulatory_report。' },
      { name: '投后管理', tip: '投后纪要；due_diligence。' },
      { name: '产品披露', tip: '说明书 RAG；kb_document。' },
      { name: '合规审查', tip: '会签；approval_flow。' },
    ],
  },
  fintech: {
    overview: '消金金科垂直包覆盖风控预警、贷后与监管报送。',
    highlights: ['风控预警', '贷后检查', '监管报送', 'KYC 联防'],
    tipScenes: [
      { name: '风控预警', tip: '欺诈/逾期；finance_aml。' },
      { name: '贷后管理', tip: '贷后检查；credit_approval。' },
      { name: '监管报送', tip: '报送任务；regulatory_report。' },
      { name: '开户 KYC', tip: '身份核验；finance_kyc。' },
    ],
  },
  logistics: {
    overview: '物流仓储深度包覆盖运单、入出库、调度签收与冷链；正式能力接真 API，空库空列表。',
    highlights: ['运单/入出库真工单', '调度签收与异常闭环', '冷链告警', '在途可视真聚合'],
    tipScenes: [
      { name: '运单跟踪', tip: '干线/城配节点；waybill_track 真表。' },
      { name: '仓储盘点', tip: '周期盘点；inventory_count。' },
      { name: '签收确认', tip: 'POD 签收；pod_signoff。' },
      { name: '冷链告警', tip: '温湿度超限；cold_chain_alert。' },
    ],
  },
  realestate: {
    overview: '房地产深度包覆盖看房签约、租赁收缴、物业投诉与装修验收；正式能力接真 API，空库空列表。',
    highlights: ['看房/签约真工单', '租金与物业费催缴', '业主投诉闭环', '楼盘经营真聚合'],
    tipScenes: [
      { name: '看房预约', tip: '档期预约；house_viewing。' },
      { name: '物业报修', tip: '业主报修；property_repair。' },
      { name: '租金收缴', tip: '账单催收；rent_collection 真表。' },
      { name: '房源上架', tip: '挂牌审核；listing_publish。' },
    ],
  },
  hotel: {
    overview: '酒店餐饮深度包聚焦客房预订、品质巡检与会员运营。',
    highlights: ['客房预订', '品质巡检', '客诉回访', '会员积分'],
    tipScenes: [
      { name: '客房预订', tip: '预订排房；hotel_booking。' },
      { name: '巡检打卡', tip: '公区巡检；site_patrol。' },
      { name: '客诉处理', tip: '登记回访；审批闭环。' },
      { name: '会员积分', tip: '会员权益；member_loyalty。' },
    ],
  },
  energy: {
    overview: '能源电力深度包覆盖设备巡检、缺陷工单与能耗监测。',
    highlights: ['设备巡检', '缺陷工单', '能耗预警', '两票管理'],
    tipScenes: [
      { name: '设备巡检', tip: '线路巡检；site_patrol。' },
      { name: '工单派发', tip: '缺陷派工；device_repair / 审批。' },
      { name: '能耗监测', tip: '异常预警；看板+通知。' },
      { name: '两票管理', tip: '工作票操作票审批。' },
    ],
  },
  gov: {
    overview: '政务公用深度包提供办事指南、诉求受理与在线审批。',
    highlights: ['办事指南', '诉求分派', '在线审批', '政务看板'],
    tipScenes: [
      { name: '办事指南', tip: '事项材料问答；gov_service。' },
      { name: '诉求受理', tip: '登记分派；审批闭环。' },
      { name: '在线审批', tip: '事项受理；审批流。' },
      { name: '政策问答', tip: '政策解读；chat_qa + kb。' },
    ],
  },
  legal: {
    overview: '法律服务深度包覆盖案件跟踪、合同审查与法规检索。',
    highlights: ['案件跟踪', '合同审查', '法规检索', '庭审提醒'],
    tipScenes: [
      { name: '案件管理', tip: '进度与材料；legal_case。' },
      { name: '合同审查', tip: '条款风险审查；kb + 审批。' },
      { name: '法规检索', tip: '判例检索；chat_qa + kb。' },
      { name: '庭审提醒', tip: '开庭节点通知。' },
    ],
  },
  hr: {
    overview: '人力资源深度包聚焦招聘入职、请假与制度问答。',
    highlights: ['招聘面试', '入离职办理', '请假报销', '制度问答'],
    tipScenes: [
      { name: '招聘面试', tip: '简历筛选；hire_onboard。' },
      { name: '入职办理', tip: '材料一站式；审批+kb。' },
      { name: '员工自助', tip: '制度福利问答；policy_qa。' },
      { name: '考勤统计', tip: '异常统计看板。' },
    ],
  },
  marketing: {
    overview: '市场营销深度包覆盖活动运营、线索培育与投放分析。',
    highlights: ['活动上线', '线索分配', '投放 ROI', '内容审核'],
    tipScenes: [
      { name: '活动策划', tip: '活动审批上线；campaign_ops。' },
      { name: '线索分配', tip: '智能分销售；sales_lead。' },
      { name: '投放分析', tip: 'ROI 看板；chart_funnel。' },
      { name: '内容审核', tip: '合规多级审核。' },
    ],
  },
  construction: {
    overview: '建筑工程深度包覆盖施工安全、材料申购与进度汇报。',
    highlights: ['隐患上报', '质量验收', '材料申购', '进度日报'],
    tipScenes: [
      { name: '安全检查', tip: '隐患整改；site_patrol。' },
      { name: '材料申购', tip: '建材审批；deco_material。' },
      { name: '验收签字', tip: '分项验收电子签字。' },
      { name: '进度填报', tip: '施工日报；看板。' },
    ],
  },
  agriculture: {
    overview: '农业深度包聚焦产销溯源、农事记录与补贴申报。',
    highlights: ['产销溯源', '田间巡检', '补贴申报', '气象预警'],
    tipScenes: [
      { name: '产销溯源', tip: '全程溯源；kb + 看板。' },
      { name: '田间巡检', tip: '作业记录表单。' },
      { name: '补贴申报', tip: '在线申报审批。' },
      { name: '气象预警', tip: '灾害推送通知。' },
    ],
  },
  media: {
    overview: '传媒内容深度包覆盖选题策划、内容审核与分发排期。',
    highlights: ['选题立项', '多级审核', '版权管理', '分发排期'],
    tipScenes: [
      { name: '选题策划', tip: '立项审批；campaign_ops。' },
      { name: '内容审核', tip: '合规多级审核。' },
      { name: '版权管理', tip: '登记授权；kb。' },
      { name: '分发排期', tip: '多平台排期+通知。' },
    ],
  },
  auto: {
    overview: '汽车交通深度包覆盖售后工单、试驾预约与客户跟进。',
    highlights: ['售后工单', '试驾预约', '配件申购', '客户跟进'],
    tipScenes: [
      { name: '售后工单', tip: '维修保养；device_repair / 审批。' },
      { name: '试驾预约', tip: '档期预约；sales_lead。' },
      { name: '配件申购', tip: '采购审批。' },
      { name: '客户回访', tip: '交车回访；chat_qa。' },
    ],
  },
}

export function buildClientStaticEnrichment(key: string): ClientIndustryEnrichment {
  const copy = PACK_COPY[key]
  const modules = PACK_CAPSHIP[key] ?? ['chat_qa', 'approval_flow', 'kb_document', 'notify_im']
  if (!copy) {
    return {
      overview: `${key} 行业深度包：场景可即选，支持 >> 悬浮框编排与一键生成 Web / App。`,
      highlights: ['正式能力优先', '场景可增减', '双端发布', '可大模型再丰富'],
      recommended_modules: modules,
      scene_tips: [],
      source: 'static',
    }
  }
  return {
    overview: copy.overview,
    highlights: copy.highlights,
    recommended_modules: modules,
    scene_tips: copy.tipScenes,
    source: 'static',
  }
}
