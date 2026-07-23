/**
 * 20 行业独立站 · 差异化视觉主题（合并豆包式行业落地页 + 现有 Catalog 内容）
 * 每行业：独立 layout / pattern / hero 结构 / 指标文案 / 亮点模块
 */

export type IndustryLayoutVariant =
  | 'corporate'
  | 'industrial'
  | 'bold'
  | 'clinical'
  | 'neon'
  | 'commerce'
  | 'academic'
  | 'institutional'
  | 'logistics'
  | 'estate'
  | 'hospitality'
  | 'energy'
  | 'civic'
  | 'judicial'
  | 'people'
  | 'campaign'
  | 'blueprint'
  | 'organic'
  | 'broadcast'
  | 'motion'

export interface IndustryVisualTheme {
  key: string
  layout: IndustryLayoutVariant
  /** CSS 背景纹理类名 */
  pattern: 'grid' | 'circuit' | 'dots' | 'diagonal' | 'waves' | 'blueprint' | 'organic' | 'minimal'
  /** Hero 装饰符号 */
  motif: string
  /** 三栏统计：值 + 标签 */
  stats: [{ value: string; label: string }, { value: string; label: string }, { value: string; label: string }]
  /** 方案总述下方 3 条亮点 */
  highlights: string[]
  /** 推荐能力模块 chips */
  focusModules: string[]
  /** Hero 副标题强化（可选，覆盖 tagline 语气） */
  heroPitch?: string
}

export const INDUSTRY_VISUAL_THEMES: Record<string, IndustryVisualTheme> = {
  office: {
    key: 'office',
    layout: 'corporate',
    pattern: 'grid',
    motif: '🏢',
    stats: [{ value: '66', label: '办公场景' }, { value: '8', label: '业务大类' }, { value: '5', label: '端同步' }],
    highlights: ['人事财务审批知识库一站打通', '制度问答 + 请假报销主路径十分钟上线', '适合集团总部与多部门协同'],
    focusModules: ['chat_qa', 'approval_flow', 'kb_document', 'chart_dashboard'],
    heroPitch: '集团级数字办公中枢 · 从制度问答到全流程审批',
  },
  mfg: {
    key: 'mfg',
    layout: 'industrial',
    pattern: 'circuit',
    motif: '🏭',
    stats: [{ value: '12', label: '制造场景' }, { value: 'OEE', label: '稼动看板' }, { value: 'MES', label: '可对接' }],
    highlights: ['设备报修派工 · SOP 工艺问答 · 质检审批闭环', '产线异常到保养提醒全链路', '图纸 BOM 检索 + 能耗碳排统计'],
    focusModules: ['approval_flow', 'chat_qa', 'kb_document', 'chart_dashboard', 'integration'],
    heroPitch: '智能制造现场 · 报修、SOP、质检、MES 一体',
  },
  sales: {
    key: 'sales',
    layout: 'corporate',
    pattern: 'grid',
    motif: '📈',
    stats: [{ value: '64', label: '销售场景' }, { value: '8', label: '业务大类' }, { value: '漏斗', label: '真数据' }],
    highlights: ['纯销售/CRM 场景 · 不搬办公人事审批', '报价合同与漏斗看板真 API', 'Salesforce / 纷享等 CRM 可对接'],
    focusModules: ['sales_lead', 'quote_contract', 'chart_funnel', 'ops_kpi', 'notify_im'],
    heroPitch: '销售增长中枢 · 64 项销售特有场景选型即交付',
  },
  med: {
    key: 'med',
    layout: 'clinical',
    pattern: 'minimal',
    motif: '🏥',
    stats: [{ value: '12', label: '医疗场景' }, { value: '合规', label: '脱敏权限' }, { value: 'HIS', label: '可对接' }],
    highlights: ['诊疗指南药品库 · 排班调班 · 不良事件上报', '患者宣教与智能导诊（对外）', '科室运营看板 + 会诊转诊'],
    focusModules: ['kb_document', 'chat_qa', 'approval_flow', 'chart_dashboard'],
    heroPitch: '智慧医院协同 · 指南、排班、导诊、HIS',
  },
  game: {
    key: 'game',
    layout: 'neon',
    pattern: 'dots',
    motif: '🎮',
    stats: [{ value: '14', label: '游戏场景' }, { value: 'FAQ', label: '玩家服务' }, { value: 'UGC', label: '内容风控' }],
    highlights: ['玩家 FAQ/攻略 · 客服工单真库 · 活动上线通知', '版号合规审查 · 双知识库 RAG', '留存看板（真工单聚合）+ 2048 可玩'],
    focusModules: ['game_support', 'approval_flow', 'kb_document', 'notify_im'],
    heroPitch: '游戏运营中台 · 玩家 FAQ、客服、活动通知',
  },
  retail: {
    key: 'retail',
    layout: 'commerce',
    pattern: 'waves',
    motif: '🛒',
    stats: [{ value: '10', label: '零售场景' }, { value: '会员', label: '积分营销' }, { value: '门店', label: '巡检' }],
    highlights: ['库存预警 · 促销审批 · 订单全渠道跟踪', '退换货工单 · 供应商对账', '陈列检查与价格变更审批'],
    focusModules: ['approval_flow', 'notify_inapp', 'chart_dashboard', 'chat_qa'],
    heroPitch: '全渠道零售 · 库存、会员、促销、订单',
  },
  edu: {
    key: 'edu',
    layout: 'academic',
    pattern: 'grid',
    motif: '🎓',
    stats: [{ value: '9', label: '教育场景' }, { value: '排课', label: '教务' }, { value: '家校', label: '通知' }],
    highlights: ['课程排课 · 题库练习 · 家校通知', '成绩分析预警 · 在线答疑', '学费收缴与考勤统计'],
    focusModules: ['kb_document', 'approval_flow', 'chat_qa', 'chart_dashboard'],
    heroPitch: '智慧校园 · 课程、题库、排课、家校',
  },
  finance: {
    key: 'finance',
    layout: 'institutional',
    pattern: 'minimal',
    motif: '💰',
    stats: [{ value: '11', label: '金融场景' }, { value: 'KYC', label: '客户核验' }, { value: 'AML', label: '反洗钱' }],
    highlights: ['合规审查 · 风控预警 · 理财智能问答', '尽调报告协同 · 授信审批', '监管报送与投后管理'],
    focusModules: ['approval_flow', 'kb_document', 'chat_qa', 'chart_dashboard'],
    heroPitch: '金融科技合规 · 风控、理财、尽调闭环',
  },
  bank: {
    key: 'bank',
    layout: 'institutional',
    pattern: 'minimal',
    motif: '🏦',
    stats: [{ value: '8', label: '银行场景' }, { value: 'KYC', label: '开户核验' }, { value: 'AML', label: '反洗钱' }],
    highlights: ['对公/零售 KYC · 授信审批', '反洗钱监测 · 合规会签', '双专属知识库'],
    focusModules: ['finance_kyc', 'finance_aml', 'credit_approval', 'kb_document'],
    heroPitch: '商业银行 · KYC、授信、反洗钱闭环',
  },
  securities: {
    key: 'securities',
    layout: 'institutional',
    pattern: 'minimal',
    motif: '📈',
    stats: [{ value: '8', label: '券商场景' }, { value: '适当性', label: '开户' }, { value: '尽调', label: '投研' }],
    highlights: ['开户适当性 · 投研尽调', '合规会签 · 产品销售', '投后跟踪'],
    focusModules: ['finance_kyc', 'due_diligence', 'approval_flow', 'kb_document'],
    heroPitch: '证券券商 · 适当性、尽调、合规',
  },
  insurance: {
    key: 'insurance',
    layout: 'institutional',
    pattern: 'minimal',
    motif: '🛡️',
    stats: [{ value: '7', label: '保险场景' }, { value: '核保', label: '承保' }, { value: '理赔', label: '赔付' }],
    highlights: ['核保理赔真工单', '代理人合规', '产品条款 RAG'],
    focusModules: ['insurance_case', 'approval_flow', 'kb_document', 'chat_qa'],
    heroPitch: '保险 · 核保、理赔、产品说明',
  },
  fund: {
    key: 'fund',
    layout: 'institutional',
    pattern: 'minimal',
    motif: '📉',
    stats: [{ value: '7', label: '资管场景' }, { value: '披露', label: '产品' }, { value: '报送', label: '监管' }],
    highlights: ['产品披露 · 投后管理', '监管报送任务', '合规审查'],
    focusModules: ['regulatory_report', 'due_diligence', 'kb_document', 'chart_dashboard'],
    heroPitch: '基金资管 · 披露、投后、报送',
  },
  fintech: {
    key: 'fintech',
    layout: 'institutional',
    pattern: 'minimal',
    motif: '💳',
    stats: [{ value: '8', label: '消金场景' }, { value: '风控', label: '预警' }, { value: '贷后', label: '管理' }],
    highlights: ['风控预警 · 贷后检查', '监管报送 · KYC 联防', '真库空列表'],
    focusModules: ['finance_aml', 'credit_approval', 'regulatory_report', 'finance_kyc'],
    heroPitch: '消金金科 · 风控、贷后、报送',
  },
  logistics: {
    key: 'logistics',
    layout: 'logistics',
    pattern: 'diagonal',
    motif: '📦',
    stats: [{ value: '22', label: '物流场景' }, { value: '真表', label: '运单仓配' }, { value: '冷链', label: '告警' }],
    highlights: ['运单跟踪 · 入出库 · 车辆调度', '签收确认 · 运费结算 · 冷链告警', '装卸排队 · 在途可视 · 异常闭环'],
    focusModules: ['waybill_track', 'inventory_count', 'cold_chain_alert', 'delivery_order'],
    heroPitch: '智慧物流 · 运单仓配调度签收真闭环',
  },
  realestate: {
    key: 'realestate',
    layout: 'estate',
    pattern: 'waves',
    motif: '🏠',
    stats: [{ value: '9', label: '地产场景' }, { value: '看房', label: '预约' }, { value: '物业', label: '报修' }],
    highlights: ['看房预约 · 签约审批 · 物业报修', '租金收缴 · 装修验收', '房源上架与业主投诉闭环'],
    focusModules: ['approval_flow', 'notify_inapp', 'chat_qa', 'chart_dashboard'],
    heroPitch: '地产全周期 · 看房、签约、物业、报修',
  },
  hotel: {
    key: 'hotel',
    layout: 'hospitality',
    pattern: 'organic',
    motif: '🏨',
    stats: [{ value: '8', label: '酒旅场景' }, { value: '客房', label: '预订' }, { value: '营收', label: '日报' }],
    highlights: ['客房预订排房 · 排班调班 · 客诉处理', '巡检打卡 · 食材申购', '会员积分与卫生检查'],
    focusModules: ['approval_flow', 'chart_dashboard', 'kb_document', 'notify_inapp'],
    heroPitch: '酒店餐饮运营 · 预订、排班、客诉、巡检',
  },
  energy: {
    key: 'energy',
    layout: 'energy',
    pattern: 'circuit',
    motif: '⚡',
    stats: [{ value: '10', label: '能源场景' }, { value: '巡检', label: '设备' }, { value: '碳排', label: '统计' }],
    highlights: ['设备巡检 · 工单派发 · 能耗监测', '安全告警 · 两票管理', '应急演练与运行日志检索'],
    focusModules: ['approval_flow', 'chart_dashboard', 'notify_inapp', 'kb_document'],
    heroPitch: '能源电力运维 · 巡检、工单、能耗、安全',
  },
  gov: {
    key: 'gov',
    layout: 'civic',
    pattern: 'grid',
    motif: '🏛',
    stats: [{ value: '11', label: '政务场景' }, { value: '12345', label: '热线' }, { value: '网格', label: '治理' }],
    highlights: ['办事指南 · 诉求受理 · 在线审批', '政策问答 · 督查督办', '证照申领与政务数据看板'],
    focusModules: ['chat_qa', 'approval_flow', 'kb_document', 'chart_dashboard'],
    heroPitch: '数字政务便民 · 办事指南、诉求、审批',
  },
  legal: {
    key: 'legal',
    layout: 'judicial',
    pattern: 'minimal',
    motif: '⚖️',
    stats: [{ value: '8', label: '法务场景' }, { value: '案件', label: '管理' }, { value: '法规', label: '检索' }],
    highlights: ['案件进度管理 · 合同风险审查', '法规判例智能检索', '立案登记 · 庭审提醒'],
    focusModules: ['kb_document', 'chat_qa', 'approval_flow', 'notify_inapp'],
    heroPitch: '律所数字化 · 案件、合同、法规检索',
  },
  hr: {
    key: 'hr',
    layout: 'people',
    pattern: 'organic',
    motif: '👥',
    stats: [{ value: '12', label: '人资场景' }, { value: '招聘', label: '面试' }, { value: '绩效', label: '评估' }],
    highlights: ['招聘面试 · 绩效评估 · 培训计划', '薪酬核算 · 入离职办理', '人才盘点与员工自助问答'],
    focusModules: ['approval_flow', 'kb_document', 'chart_dashboard', 'chat_qa'],
    heroPitch: '人力资源数智化 · 招聘、绩效、培训、薪酬',
  },
  marketing: {
    key: 'marketing',
    layout: 'campaign',
    pattern: 'diagonal',
    motif: '📣',
    stats: [{ value: '9', label: '营销场景' }, { value: 'ROI', label: '投放' }, { value: '线索', label: '分配' }],
    highlights: ['活动策划审批 · 线索智能分配', '内容合规审核 · 投放分析', '竞品监测与效果复盘'],
    focusModules: ['approval_flow', 'chart_dashboard', 'kb_document', 'notify_inapp'],
    heroPitch: '增长营销中枢 · 活动、线索、内容、投放',
  },
  construction: {
    key: 'construction',
    layout: 'blueprint',
    pattern: 'blueprint',
    motif: '🏗',
    stats: [{ value: '10', label: '工程场景' }, { value: '安全', label: '检查' }, { value: '验收', label: '签字' }],
    highlights: ['进度日报 · 安全检查 · 材料申购', '分项验收电子签字 · 图纸变更', '劳务考勤与竣工归档'],
    focusModules: ['approval_flow', 'form_widget', 'chart_dashboard', 'kb_document'],
    heroPitch: '智慧工地 · 进度、安全、材料、验收',
  },
  agriculture: {
    key: 'agriculture',
    layout: 'organic',
    pattern: 'organic',
    motif: '🌾',
    stats: [{ value: '7', label: '农业场景' }, { value: '溯源', label: '产销' }, { value: '补贴', label: '申报' }],
    highlights: ['产销全程溯源 · 田间巡检', '补贴在线申报 · 气象预警', '病虫害识别与合作社管理'],
    focusModules: ['kb_document', 'approval_flow', 'notify_inapp', 'chat_qa'],
    heroPitch: '数字农业 · 溯源、巡检、补贴、产销',
  },
  media: {
    key: 'media',
    layout: 'broadcast',
    pattern: 'waves',
    motif: '📺',
    stats: [{ value: '9', label: '传媒场景' }, { value: '审核', label: '内容' }, { value: '版权', label: '管理' }],
    highlights: ['选题策划 · 内容多级审核', '版权登记授权 · 分发排期', '舆情监测与阅读量分析'],
    focusModules: ['approval_flow', 'kb_document', 'chart_dashboard', 'notify_inapp'],
    heroPitch: '传媒内容中台 · 选题、审核、版权、分发',
  },
  auto: {
    key: 'auto',
    layout: 'motion',
    pattern: 'diagonal',
    motif: '🚗',
    stats: [{ value: '10', label: '汽车场景' }, { value: '售后', label: '工单' }, { value: '试驾', label: '预约' }],
    highlights: ['试驾预约 · 售后维修工单', '保养到期提醒 · 事故报案引导', '门店客流与延保推介'],
    focusModules: ['approval_flow', 'notify_inapp', 'chat_qa', 'chart_dashboard'],
    heroPitch: '汽车服务数字化 · 售后、试驾、配件、工单',
  },
}

const DEFAULT_THEME: IndustryVisualTheme = INDUSTRY_VISUAL_THEMES.office

export function getIndustryVisualTheme(key: string): IndustryVisualTheme {
  return INDUSTRY_VISUAL_THEMES[key] ?? DEFAULT_THEME
}
