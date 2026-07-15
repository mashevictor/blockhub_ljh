export interface ScenarioPick {
  key: string
  category: string
  icon: string
  title: string
  desc: string
  capability: string
  agent: string
  /** 写入输入框的一句话描述 */
  promptLine: string
}

/** 从业务场景库抽取的可点选场景卡片 */
export const SCENARIO_PICKS: ScenarioPick[] = [
  // 人事行政
  { key: 'leave', category: '人事行政', icon: '📝', title: '请假申请', desc: '在线请假，多级审批自动流转', capability: 'approval_flow', agent: '审批', promptLine: '请假申请与多级审批（含年假/事假/病假）' },
  { key: 'expense', category: '人事行政', icon: '💰', title: '费用报销', desc: '上传发票，财务审核，自动入账提醒', capability: 'approval_flow', agent: '审批', promptLine: '费用报销审批流（发票上传+财务审核+打款提醒）' },
  { key: 'attendance', category: '人事行政', icon: '⏰', title: '考勤查询', desc: '打卡记录、异常申诉、部门统计', capability: 'chart_basic', agent: '报表', promptLine: '考勤查询与异常申诉（对接考勤数据看板）' },
  { key: 'handbook', category: '人事行政', icon: '📖', title: '制度手册问答', desc: '制度、福利、入职政策智能问答', capability: 'chat_qa', agent: '问答', promptLine: '制度手册与福利政策智能问答' },

  // 流程审批
  { key: 'approval_general', category: '流程审批', icon: '✅', title: '通用审批', desc: '自定义表单 + 工作流，适配各类申请', capability: 'approval_flow', agent: '审批', promptLine: '通用审批工作流（表单+多级路由+待办中心）' },
  { key: 'approval_inbox', category: '流程审批', icon: '📥', title: '待办中心', desc: '待办/已办/代理审批，一键处理', capability: 'approval_inbox', agent: '审批', promptLine: '待办已办中心（审批提醒+超时催办）' },
  { key: 'contract', category: '流程审批', icon: '📄', title: '合同审批', desc: '法务/财务会签，电子签批', capability: 'approval_countersign', agent: '审批', promptLine: '合同法务财务会签审批（支持会签/或签）' },
  { key: 'seal', category: '流程审批', icon: '🔏', title: '用印申请', desc: '公章/合同章在线申请与留痕', capability: 'approval_flow', agent: '审批', promptLine: '用印申请与用印记录归档' },

  // 知识协同
  { key: 'kb_policy', category: '知识协同', icon: '📚', title: '制度文档库', desc: 'PDF/Word 上传，切片检索，权限管控', capability: 'kb_document', agent: '知识库', promptLine: '制度文档知识库（上传+切片+语义检索）' },
  { key: 'kb_faq', category: '知识协同', icon: '💬', title: '内部 FAQ 问答', desc: '多轮对话 + 引用来源，7×24 解答', capability: 'chat_qa', agent: '问答', promptLine: '内部 FAQ 智能问答（多轮对话+文档引用）' },
  { key: 'kb_sop', category: '知识协同', icon: '📋', title: 'SOP 作业指导', desc: '作业指导书检索，车间/现场可查', capability: 'kb_search', agent: '知识库', promptLine: 'SOP 作业指导书检索与问答' },
  { key: 'meeting', category: '知识协同', icon: '🗓', title: '会议纪要检索', desc: '历史纪要语义搜索，快速回顾决策', capability: 'kb_search', agent: '知识库', promptLine: '会议纪要上传与语义检索' },

  // 数据报表
  { key: 'dashboard', category: '数据报表', icon: '📊', title: '部门看板', desc: 'KPI 卡片 + 图表，一屏看清运营情况', capability: 'chart_dashboard', agent: '报表', promptLine: '部门运营数据看板（KPI+折线/柱状图）' },
  { key: 'nl_query', category: '数据报表', icon: '🔍', title: '智能问数', desc: '「上月审批通过率？」说话即可查询', capability: 'data_nl_query', agent: '报表', promptLine: '对话式数据查询与统计报表' },
  { key: 'funnel', category: '数据报表', icon: '📉', title: '销售漏斗', desc: '线索→商机→成交转化可视化', capability: 'chart_funnel', agent: '报表', promptLine: '销售漏斗看板（线索商机转化追踪）' },
  { key: 'approval_stats', category: '数据报表', icon: '📈', title: '审批效率统计', desc: '平均处理时长、通过率趋势', capability: 'chart_basic', agent: '报表', promptLine: '审批效率与通过率统计报表' },

  // 通知集成
  { key: 'notify_approval', category: '消息通知', icon: '🔔', title: '审批提醒', desc: '待办推送至站内信/企微/钉钉', capability: 'notify_inapp', agent: '通知', promptLine: '审批待办提醒（站内信+企微/钉钉推送）' },
  { key: 'notify_announce', category: '消息通知', icon: '📢', title: '公告推送', desc: '全员公告栏，已读未读追踪', capability: 'announce_board', agent: '通知', promptLine: '企业公告栏与全员推送' },

  // 行业场景（抽样）
  { key: 'mfg_repair', category: '制造业', icon: '🔧', title: '设备报修', desc: '产线故障拍照报修，派工跟踪', capability: 'device_repair', agent: '报修', promptLine: '产线设备报修派工（拍照+工单流转）' },
  { key: 'sales_quote', category: '销售行业', icon: '💼', title: '报价折扣审批', desc: '超权限折扣需主管审批', capability: 'approval_flow', agent: '审批', promptLine: '销售报价/折扣超权限审批' },
  { key: 'sales_script', category: '销售行业', icon: '🎯', title: '产品话术问答', desc: '竞品对比、参数查询，销售随身助手', capability: 'chat_qa', agent: '问答', promptLine: '销售产品话术与竞品参数问答' },
  { key: 'med_triage', category: '医疗行业', icon: '🏥', title: '智能导诊', desc: '患者预问诊，对外轻量网页或 App', capability: 'med_triage', agent: '导诊', promptLine: '对外智能导诊与预问诊' },
  { key: 'nurse_shift', category: '医疗行业', icon: '🗓️', title: '护士排班', desc: '调班申请与护士长批复', capability: 'nurse_shift', agent: '排班', promptLine: '护士调班申请与批复' },
  { key: 'member_loyalty', category: '零售电商', icon: '🎁', title: '会员营销', desc: '积分活动登记与触达确认', capability: 'member_loyalty', agent: '营销', promptLine: '会员积分促销活动与触达' },
  { key: 'game_faq', category: '游戏行业', icon: '🎮', title: '玩家 FAQ', desc: '活动规则、攻略与客服工单', capability: 'game_support', agent: '客服', promptLine: '玩家 FAQ 与客服工单' },
  { key: 'school_notice', category: '教育培训', icon: '📢', title: '家校通知', desc: '通知/报名/家长留言', capability: 'school_notice', agent: '家校', promptLine: '家校通知与活动报名' },
  { key: 'homework_qa', category: '教育培训', icon: '📝', title: '作业答疑', desc: '作业提交与课程答疑', capability: 'homework_qa', agent: '教学', promptLine: '作业提交与课程答疑' },
  { key: 'class_schedule', category: '教育培训', icon: '📅', title: '课表查询', desc: '课程/考试/教室安排', capability: 'class_schedule', agent: '教务', promptLine: '课表与考试教室安排' },
  { key: 'property_repair', category: '生活服务', icon: '🏠', title: '物业报修', desc: '业主报修派工闭环', capability: 'property_repair', agent: '物业', promptLine: '物业报修与派工维修' },
  { key: 'site_patrol', category: '现场运维', icon: '🦺', title: '巡检打卡', desc: '站点巡检与隐患闭环', capability: 'site_patrol', agent: '巡检', promptLine: '设备巡检打卡与隐患上报' },
  { key: 'hotel_booking', category: '酒店餐饮', icon: '🏨', title: '酒店预订', desc: '客房入住退房登记', capability: 'hotel_booking', agent: '前台', promptLine: '酒店客房预订与入住' },
  { key: 'it_help', category: 'IT 与资产', icon: '🛠', title: 'IT 报障', desc: '故障工单提交，IT 值班分派', capability: 'it_helpdesk', agent: '外部数据', promptLine: 'IT 报障工单与值班分派' },
  { key: 'erp', category: '外部对接', icon: '🔌', title: '对接 ERP/OA', desc: 'SAP/用友/钉钉数据双向同步', capability: 'erp_connector', agent: '外部数据', promptLine: '对接 ERP/OA 系统数据同步' },
]

/** 根据已选场景 key 列表，合成输入框文案 */
export function composePromptFromScenarios(keys: string[]): string {
  if (!keys.length) return ''
  const picks = SCENARIO_PICKS.filter((p) => keys.includes(p.key))
  const byCat = picks.reduce<Record<string, ScenarioPick[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p)
    return acc
  }, {})
  const intro = '我需要搭建一套企业智能应用，包含以下场景：'
  const lines = Object.entries(byCat).map(([cat, items]) => {
    const sceneText = items.map((i) => i.promptLine).join('；')
    return `\n【${cat}】${sceneText}`
  })
  const footer = `\n\n系统将自动组合所需功能并生成网页版${picks.some((p) => p.key === 'med_triage' || p.key.includes('game')) ? '，如需对外服务可同时生成对外轻量版' : ''}。`
  return intro + lines.join('') + footer
}

export const SCENARIO_CATEGORIES = [...new Set(SCENARIO_PICKS.map((p) => p.category))]
