/** B2B 落地页 · AI 模板 / 模块 / 行业 / 原子能力 / 大模型 展示数据 */

import { INDUSTRIES_SHOWCASE } from './showcase'
import { SCENES } from './constants'

export type TemplatePreviewKind =
  | 'chat'
  | 'approval'
  | 'dashboard'
  | 'kb'
  | 'voice'
  | 'integration'
  | 'suite'
  | 'notify'
  | 'agent'
  | 'llm'
  | 'module'

export interface AgentTemplate {
  id: string
  name: string
  tag: string
  summary: string
  features: string[]
  color: string
  gradientFrom: string
  gradientTo: string
  iconKey: string
  preview: TemplatePreviewKind
}

export interface InsertModule {
  key: string
  name: string
  category: string
  icon: string
  desc: string
  useCase: string
  color: string
}

export interface IndustrySolution {
  key: string
  name: string
  iconKey: string
  color: string
  count: number
  tagline: string
  solutions: string[]
  fullPack?: boolean
}

export interface AtomicCapability {
  id: string
  name: string
  tag: string
  summary: string
  iconKey: string
  color: string
  highlight?: boolean
}

export interface LlmPoweredAgent {
  id: string
  name: string
  /** 展示用模型类型标签（区分能力场景） */
  modelLabel: string
  summary: string
  features: string[]
  scene: string
  color: string
}

/** @deprecated 请用 LlmPoweredAgent */
export type DeepSeekAgent = LlmPoweredAgent

/** 开箱即用场景模板 */
export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'ai-chat-qa',
    name: 'AI 智能问答',
    tag: '知识协同',
    summary: '结合企业知识库，制度与业务问题即问即答，引用原文可追溯',
    features: ['RAG 检索增强与引用气泡', '多轮对话 SSE 流式输出', '多模型切换与会话历史'],
    color: '#4338ca',
    gradientFrom: '#eef2ff',
    gradientTo: '#e0e7ff',
    iconKey: 'chat_qa',
    preview: 'chat',
  },
  {
    id: 'ai-approval',
    name: 'AI 审批流程',
    tag: '流程审批',
    summary: '请假、报销、用印等通用审批在线提交，主管待办一键处理',
    features: ['提交即触发消息通知', '多级会签与状态机', '审批结果实时回传申请人'],
    color: '#dc2626',
    gradientFrom: '#fef2f2',
    gradientTo: '#fee2e2',
    iconKey: 'approval',
    preview: 'approval',
  },
  {
    id: 'ai-kb',
    name: 'AI 知识库',
    tag: '知识数据',
    summary: 'PDF/Word 上传自动切片，问答与审批场景共享语义检索能力',
    features: ['pgvector 语义检索', '文档上传与异步解析', '引用溯源到原文段落'],
    color: '#059669',
    gradientFrom: '#ecfdf5',
    gradientTo: '#d1fae5',
    iconKey: 'kb',
    preview: 'kb',
  },
  {
    id: 'ai-dashboard',
    name: 'AI 数据看板',
    tag: '数据报表',
    summary: 'KPI 卡片与自然语言问数，审批与问答使用量一屏掌握',
    features: ['fl_chart 图表组件', '一句话查数 NL Query', '近 7 日趋势真数据'],
    color: '#0ea5e9',
    gradientFrom: '#f0f9ff',
    gradientTo: '#e0f2fe',
    iconKey: 'report',
    preview: 'dashboard',
  },
  {
    id: 'ai-voice',
    name: 'AI 上海话语音',
    tag: '智能交互',
    summary: '电信星辰 ASR/TTS + 大模型，沪语实时语音对话，支持打断',
    features: ['WebSocket 流式语音', 'PCM 播放与断句识别', '方言场景客服演示'],
    color: '#7c3aed',
    gradientFrom: '#f5f3ff',
    gradientTo: '#ede9fe',
    iconKey: 'chat_qa',
    preview: 'voice',
  },
  {
    id: 'ai-integration',
    name: 'AI 系统集成',
    tag: '通知集成',
    summary: 'Webhook 连接器与 ETL 任务，审批联动企微/OA 推送',
    features: ['连接器 CRUD + 同步任务', '审批触发站内信', 'REST API 开放对接'],
    color: '#0f766e',
    gradientFrom: '#f0fdfa',
    gradientTo: '#ccfbf1',
    iconKey: 'integration',
    preview: 'integration',
  },
  {
    id: 'ai-notify',
    name: 'AI 消息通知',
    tag: '消息通知',
    summary: '审批提醒、公告广播与企微/钉钉多渠道触达，不漏关键节点',
    features: ['站内信 + IM 双通道', '审批状态变更推送', '活动公告定时发送'],
    color: '#f59e0b',
    gradientFrom: '#fffbeb',
    gradientTo: '#fef3c7',
    iconKey: 'notify',
    preview: 'notify',
  },
  {
    id: 'ai-multi-agent',
    name: 'AI 多助手编排',
    tag: '智能交互',
    summary: '问答、审批、报表多 Agent 协同，按场景自动路由到合适助手',
    features: ['意图识别自动分流', '跨 Agent 上下文共享', '可视化能力编排'],
    color: '#8b5cf6',
    gradientFrom: '#faf5ff',
    gradientTo: '#f3e8ff',
    iconKey: 'workflow',
    preview: 'agent',
  },
  {
    id: 'ai-nl-query',
    name: 'AI 智能问数',
    tag: '数据报表',
    summary: '用自然语言查业务数据，自动生成图表与洞察摘要',
    features: ['NL2SQL 安全沙箱', '图表一键导出', '与看板模块联动'],
    color: '#0284c7',
    gradientFrom: '#f0f9ff',
    gradientTo: '#e0f2fe',
    iconKey: 'report',
    preview: 'dashboard',
  },
]

/** 10 个高频插入模块 */
export const COMMON_INSERT_MODULES: InsertModule[] = [
  {
    key: 'chat_qa',
    name: '智能问答',
    category: '智能交互',
    icon: '💬',
    desc: '结合知识库回答制度与业务问题',
    useCase: '制度政策、产品参数、FAQ',
    color: '#4338ca',
  },
  {
    key: 'approval_flow',
    name: '审批流',
    category: '流程审批',
    icon: '✅',
    desc: '请假、报销、通用审批在线流转',
    useCase: '人事行政、财务报销',
    color: '#dc2626',
  },
  {
    key: 'kb_document',
    name: '知识库',
    category: '知识数据',
    icon: '📚',
    desc: '文档上传切片，语义检索问答',
    useCase: '员工手册、SOP、合同范本',
    color: '#059669',
  },
  {
    key: 'approval_inbox',
    name: '待办中心',
    category: '流程审批',
    icon: '📥',
    desc: '聚合待我审批与已办事项',
    useCase: '主管工作台、移动审批',
    color: '#e11d48',
  },
  {
    key: 'chart_dashboard',
    name: '数据看板',
    category: '可视化',
    icon: '📊',
    desc: 'KPI 卡片与趋势图表一屏总览',
    useCase: '运营日报、部门看板',
    color: '#0ea5e9',
  },
  {
    key: 'notify_inapp',
    name: '站内信',
    category: '通知集成',
    icon: '🔔',
    desc: '审批提醒与系统公告站内触达',
    useCase: '流程节点通知、活动广播',
    color: '#f59e0b',
  },
  {
    key: 'notify_im',
    name: '企微钉钉',
    category: '通知集成',
    icon: '💼',
    desc: '对接企业微信/钉钉消息推送',
    useCase: '外勤提醒、审批催办',
    color: '#0f766e',
  },
  {
    key: 'rbac_page',
    name: '角色权限',
    category: '权限/外部',
    icon: '🔐',
    desc: '按角色控制页面与操作权限',
    useCase: '多部门、多租户隔离',
    color: '#64748b',
  },
  {
    key: 'chart_funnel',
    name: '销售漏斗',
    category: '可视化',
    icon: '📉',
    desc: '商机阶段转化与漏斗分析',
    useCase: '销售团队 CRM 看板',
    color: '#ef4444',
  },
  {
    key: 'shanghai_voice',
    name: '上海话语音',
    category: '智能交互',
    icon: '🎙️',
    desc: '沪语实时语音对话智能体',
    useCase: '方言客服、本地化演示',
    color: '#7c3aed',
  },
]

/** 扩展行业典型方案（无 SCENES 条目时按行业描述生成） */
const EXTENDED_SOLUTIONS: Record<string, string[]> = {
  retail: ['库存预警', '会员营销', '促销审批', '订单跟踪', '门店巡检', '退换货处理', '供应商对账', '会员积分', '价格变更', '陈列检查'],
  edu: ['课程排课', '题库练习', '家校通知', '成绩分析', '请假审批', '教材管理', '在线答疑', '考勤统计', '学费收缴'],
  finance: ['合规审查', '风控预警', '理财问答', '尽调报告', '合同审批', '反洗钱监测', '客户 KYC', '产品说明', '投后管理', '监管报送', '授信审批'],
  bank: ['对公开户 KYC', '零售开户 KYC', '授信审批', '反洗钱监测', '合规审查', '银行合规库', '产品信贷库', '风险经营看板'],
  securities: ['开户适当性', '投研尽调', '合规审查', '产品销售', '反洗钱监测', '券商合规库', '产品投研库', '经营看板'],
  insurance: ['核保', '理赔', '代理人合规', '产品说明', '保险合规库', '产品条款库', '经营看板'],
  fund: ['产品披露', '投后管理', '监管报送', '合规审查', '资管合规库', '产品披露库', '经营看板'],
  fintech: ['风控预警', '贷后管理', '监管报送', '开户 KYC', '消金合规库', '产品贷后库', '经营看板'],
  logistics: [
    '运单跟踪',
    '入库验收',
    '出库拣配',
    '仓储盘点',
    '车辆调度',
    '签收确认',
    '异常上报',
    '路线任务派发',
    '运费结算',
    '冷链告警',
    '装卸排队',
    '在途可视看板',
    '末端配送单',
    '退货入库',
  ],
  realestate: [
    '看房预约',
    '签约认购',
    '物业报修',
    '租金收缴',
    '客户跟进',
    '房源上架',
    '装修验收',
    '业主投诉',
    '租约续签',
    '物业费催缴',
    '看房回访',
    '中介佣金结算',
    '交房验收',
    '楼盘经营看板',
  ],
  hotel: ['客房预订', '排班调班', '客诉处理', '巡检打卡', '食材申购', '会员积分', '卫生检查', '营收日报'],
  energy: ['设备巡检', '工单派发', '能耗监测', '安全告警', '缺陷上报', '两票管理', '备件领用', '运行日志', '应急演练', '碳排统计'],
  gov: ['办事指南', '诉求受理', '在线审批', '政策问答', '信息公开', '督查督办', '便民服务', '热线转办', '证照申领', '数据统计', '网格治理'],
  legal: ['案件管理', '合同审查', '法规检索', '律师排期', '立案登记', '证据归档', '庭审提醒', '法律顾问'],
  hr: ['招聘面试', '绩效评估', '培训计划', '薪酬核算', '入职办理', '离职交接', '考勤统计', '人才盘点', '编制申请', '员工自助', '组织变更', '福利发放'],
  marketing: ['活动策划', '线索分配', '内容审核', '投放分析', '竞品监测', '素材库', '渠道归因', '预算审批', '效果复盘'],
  construction: ['进度填报', '安全检查', '材料申购', '验收签字', '图纸变更', '劳务考勤', '质量整改', '分包结算', '隐患上报', '竣工归档'],
  agriculture: ['产销溯源', '田间巡检', '补贴申报', '农资采购', '气象预警', '病虫害上报', '合作社管理'],
  media: ['选题策划', '内容审核', '版权管理', '分发排期', '舆情监测', '素材库', '稿费结算', '阅读量分析', '广告排期'],
  auto: ['试驾预约', '售后工单', '配件申购', '保养提醒', '客户回访', '事故报案', '二手车评估', '门店客流', '试驾反馈', '延保销售'],
}

function solutionsForIndustry(key: string): string[] {
  const scenes = SCENES[key]
  if (scenes?.length) return scenes
  return EXTENDED_SOLUTIONS[key] ?? []
}

/** 全部行业名称 + 解决方案 */
export const INDUSTRY_SOLUTIONS: IndustrySolution[] = INDUSTRIES_SHOWCASE.map((ind) => ({
  key: ind.key,
  name: ind.name,
  iconKey: ind.iconKey,
  color: ind.color,
  count: ind.count,
  tagline: ind.desc,
  solutions: solutionsForIndustry(ind.key),
  fullPack: ind.fullPack ?? true,
}))

/** AI 智能体原子能力 */
export const ATOMIC_AI_CAPABILITIES: AtomicCapability[] = [
  {
    id: 'atom-chat',
    name: '智能问答',
    tag: 'RAG',
    summary: '知识库检索增强，多轮对话流式输出，引用原文可溯源',
    iconKey: 'chat_qa',
    color: '#4338ca',
  },
  {
    id: 'atom-shanghai',
    name: '上海话语音智能体',
    tag: '方言',
    summary: '星辰 ASR/TTS + 方言大模型沪语回复，Web/Flutter 双端实时对话',
    iconKey: 'chat_qa',
    color: '#7c3aed',
    highlight: true,
  },
  {
    id: 'atom-voice',
    name: '普通话语音问答',
    tag: '语音',
    summary: '语音输入识别与 TTS 播报，适合外勤与无障碍场景',
    iconKey: 'chat_qa',
    color: '#6366f1',
  },
  {
    id: 'atom-multi',
    name: '多助手编排',
    tag: '编排',
    summary: '问答、审批、报表多 Agent 按意图自动路由协同',
    iconKey: 'workflow',
    color: '#8b5cf6',
  },
  {
    id: 'atom-kb',
    name: '知识库检索',
    tag: '向量',
    summary: '文档切片 + pgvector 语义搜索，支持 PDF/Word 批量导入',
    iconKey: 'kb',
    color: '#059669',
  },
  {
    id: 'atom-approval',
    name: '审批 Agent',
    tag: '流程',
    summary: '表单提交、会签流转、待办聚合与状态机驱动',
    iconKey: 'approval',
    color: '#dc2626',
  },
  {
    id: 'atom-nl',
    name: '智能问数',
    tag: 'NL2SQL',
    summary: '自然语言查业务数据，自动生成图表与摘要洞察',
    iconKey: 'report',
    color: '#0ea5e9',
  },
  {
    id: 'atom-notify',
    name: '消息推送 Agent',
    tag: '通知',
    summary: '站内信、企微、钉钉多渠道触达，审批节点自动提醒',
    iconKey: 'notify',
    color: '#f59e0b',
  },
  {
    id: 'atom-integration',
    name: '系统集成 Agent',
    tag: '对接',
    summary: 'Webhook/REST 连接器，ERP、OA、MES 数据双向同步',
    iconKey: 'integration',
    color: '#0f766e',
  },
  {
    id: 'atom-security',
    name: '安全合规 Agent',
    tag: '审计',
    summary: 'RBAC 权限、操作审计、敏感字段脱敏与合规留痕',
    iconKey: 'security',
    color: '#64748b',
  },
  {
    id: 'atom-portal',
    name: '多端门户 Agent',
    tag: '交付',
    summary: '一次 Schema 发布，Web/iOS/Android/Win/Mac 五端同步',
    iconKey: 'portal',
    color: '#ec4899',
  },
  {
    id: 'atom-creation',
    name: '智能创建 Agent',
    tag: '编排',
    summary: '描述需求自动推荐模块，评估方案后一键发布应用',
    iconKey: 'creation',
    color: '#6366f1',
  },
  {
    id: 'atom-compose-edit',
    name: '对话改页',
    tag: 'CapShip',
    summary: '用对话改菜单和页面，先自己预览；保存草稿、提交审批后，全员才看到正式效果',
    iconKey: 'creation',
    color: '#0d9488',
    highlight: true,
  },
]

/** CapShip 对话改页 · 首页产品说明（对用户文案，避免技术术语） */
export interface PlatformOrchestrationStep {
  id: string
  step: string
  title: string
  summary: string
}

export const PLATFORM_ORCHESTRATION_STEPS: PlatformOrchestrationStep[] = [
  {
    id: 'compose',
    step: '01',
    title: '对话改页',
    summary: '用自然语言改菜单与页面布局，左侧马上能看到效果；此时只影响你的预览，不影响其他人',
  },
  {
    id: 'draft',
    step: '02',
    title: '个人草稿',
    summary: '改满意后保存为自己的草稿，仅本人可见；还可继续改，或取消草稿',
  },
  {
    id: 'approve',
    step: '03',
    title: '审批发布',
    summary: '提交给管理员审批，通过后才正式生效，全员打开应用都能看到新页面',
  },
]

/** 大模型驱动的 5 类 AI 能力 */
export const LLM_POWERED_AGENTS: LlmPoweredAgent[] = [
  {
    id: 'llm-intent',
    name: '意图解析',
    modelLabel: '推荐大模型',
    summary: '用户用自然语言描述需求，大模型自动拆解为行业、场景与模块组合，置信度低时智能补全',
    features: ['100 场景评估 99/100 命中', '关键词 + 大模型双路推荐', '发布前 intentPublish 预检'],
    scene: '描述创建 · 模块推荐',
    color: '#1d4ed8',
  },
  {
    id: 'llm-chat',
    name: '智能问答',
    modelLabel: '对话大模型',
    summary: 'RAG 检索增强 + 大模型 SSE 流式对话，支持多轮上下文与引用气泡展示',
    features: ['流式打字效果', '知识库段落引用', '错误重试与多模型切换'],
    scene: '制度问答 · 业务咨询',
    color: '#4338ca',
  },
  {
    id: 'llm-contract',
    name: '合同起草',
    modelLabel: '生成大模型',
    summary: '结构化表单填写后，由大模型自动生成完整合同正文，支持润色与条款补全',
    features: ['劳动/采购等模板填空', '大模型生成完整合同', '电子签章联动'],
    scene: '法务 · 人事合同',
    color: '#0f766e',
  },
  {
    id: 'llm-flow-api',
    name: '数据流生成',
    modelLabel: '编排大模型',
    summary: '大模型为数据流各节点自动生成模拟 REST API，含输入/输出节点与字段映射',
    features: ['节点级 API 描述', '规则兜底 + 大模型升级', '可视化数据流编排'],
    scene: '集成对接 · 流程模拟',
    color: '#0891b2',
  },
  {
    id: 'llm-shanghai',
    name: '沪语对话',
    modelLabel: '方言大模型',
    summary: '上海话 ASR 识别后由方言大模型生成地道沪语回复，再 TTS 流式合成播报',
    features: ['方言 system prompt', '按句流式返回', '与星辰语音链路串联'],
    scene: '上海话语音智能体',
    color: '#7c3aed',
  },
]

/** @deprecated 请用 LLM_POWERED_AGENTS */
export const DEEPSEEK_AI_AGENTS = LLM_POWERED_AGENTS
