import type { AgentPick } from '../components/agentInputLogic'

export interface RolePreset {
  id: string
  label: string
  hint: string
  /** 身份标签：HR、销售、家长… */
  role?: string
  weight: number
  color: string
  prompt: string
  picks: AgentPick[]
  flowLines: string[]
}

/** 身份 × 场景 映射 */
const PRESET_ROLES: Record<string, string> = {
  s01: 'HR', s02: '财务', s03: '同事', s04: 'HR', s05: '销售',
  s06: '销售', s07: '老板', s08: '制造', s09: '质检', s10: '零售',
  s11: '运营', s12: '医护', s13: '护士', s14: '玩家', s15: '家长',
  s16: '学生', s17: '学生', s18: '运营', s19: '业主', s20: '销售',
  s21: '酒店', s22: '骑手', s23: '会员', s24: '旅行', s25: '新人',
  s26: '业主', s27: '宠主', s28: '巡检', s29: '市民', s30: '法务', s31: '全员',
  s32: '学生', s33: '家长', s34: '老师',
}

export function presetRole(p: RolePreset): string {
  return p.role ?? PRESET_ROLES[p.id] ?? p.hint.split('·')[0]?.trim() ?? '用户'
}

function scene(
  id: string,
  label: string,
  hint: string,
  color: string,
  prompt: string,
  picks: AgentPick[],
  flowLines: string[],
  weightOrRole: number | string = 3,
): RolePreset {
  const weight = typeof weightOrRole === 'number' ? weightOrRole : 3
  const role = typeof weightOrRole === 'string' ? weightOrRole : undefined
  return { id, label, hint, role, weight, color, prompt, picks, flowLines }
}

/** 30 个生活 / 工作真实场景 — 英雄区弹幕词云 */
export const ROLE_PRESETS: RolePreset[] = [
  scene('s00', '上海话语音助手', '方言 · 交互', '#e11d48',
    '用上海话实时语音对话，说方言也能问答、办事。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'module', key: 'shanghai_voice', label: '上海话语音' },
    ],
    ['>> 上海话语音 · 开口即说', '>> 实时 ASR · 方言识别', '>> 智能问答 · 语音播报', '>> 网页/APK · 一键生成']),
  scene('s01', '请假审批', '人事 · 流程', '#8b5cf6',
    '请假在线申请、主管审批与假期余额查询。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's01-main', label: '请假审批' },
      { type: 'module', key: 'leave_request', label: '请假审批' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 请假审批 · 在线提单', '>> 主管批复 · 通过/驳回', '>> 企微钉钉飞书 · 结果推送', '>> CapShip · 双端真接口'], 'HR'),

  scene('s02', '报销记账', '财务 · 票据', '#0284c7',
    '费用报销拍照上传、财务审核与台账查询。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's02-main', label: '报销记账' },
      { type: 'module', key: 'expense_claim', label: '报销记账' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 报销记账 · 费用登记', '>> 财务审核 · 付款闭环', '>> 企微钉钉飞书 · 审核推送', '>> CapShip · 双端真接口'], '财务'),

  scene('s03', '制度问答', '知识 · 自助', '#6366f1',
    '公司制度、福利政策智能问答，随时自助查询。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's03-main', label: '制度问答' },
      { type: 'module', key: 'policy_qa', label: '制度问答' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 制度问答 · 提问入库', '>> 答复归档 · 知识闭环', '>> 企微钉钉飞书 · 答复推送', '>> CapShip · 双端真接口'], '使用者'),

  scene('s04', '招聘入职', 'HR · 人才', '#a855f7',
    '招聘发布、简历筛选与入职指引一站式。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's04-main', label: '招聘入职' },
      { type: 'module', key: 'hire_onboard', label: '招聘入职' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 招聘入职 · 候选人登记', '>> 面试/Offer · 入职闭环', '>> 企微钉钉飞书 · 进度推送', '>> CapShip · 双端真接口'], 'HR'),

  scene('s05', '销售线索', '获客 · 角色视图', '#ef4444',
    '按身份看获客方法：录入/分配/公海；跟进成交另开漏斗。',
    [
      { type: 'industry', key: 'sales', label: '销售行业' },
      { type: 'scenario', key: 's05-main', label: '销售线索' },
      { type: 'module', key: 'sales_lead', label: '销售线索' },
      { type: 'module', key: 'deal_evidence', label: '成交证据' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 获客方法 · 身份首页', '>> 跟进成交 · 证据门禁', '>> 企微钉钉飞书 · 跟进提醒', '>> CapShip · 双端真接口'], '销售'),

  scene('s06', '报价合同', '销售 · 签单', '#dc2626',
    '报价审批、合同评审与特价申请。',
    [
      { type: 'industry', key: 'sales', label: '销售行业' },
      { type: 'scenario', key: 's06-main', label: '报价合同' },
      { type: 'module', key: 'quote_contract', label: '报价合同' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 报价合同 · 单据登记', '>> 评审签约 · 闭环完成', '>> 企微钉钉飞书 · 审批推送', '>> CapShip · 双端真接口'], '销售'),

  scene('s07', '经营看板', '老板 · 决策', '#f59e0b',
    '核心经营指标一屏掌控，自然语言查数。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's07-main', label: '经营看板' },
      { type: 'module', key: 'ops_kpi', label: '经营看板' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 经营看板 · 指标登记', '>> 发布预警 · 归档闭环', '>> 企微钉钉飞书 · 指标推送', '>> CapShip · 双端真接口'], '老板'),

  scene('s08', '设备报修', '制造 · 运维', '#3b82f6',
    '现场设备故障报修、工单派发与维修跟踪。',
    [
      { type: 'industry', key: 'mfg', label: '传统制造' },
      { type: 'scenario', key: 's08-repair', label: '设备报修' },
      { type: 'module', key: 'device_repair', label: '设备报修' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 设备报修 · 扫码提单', '>> 工单派发 · 进度跟踪', '>> 企微钉钉飞书 · 状态推送', '>> CapShip · 双端真接口']),
  scene('s09', '质检SOP', '制造 · 工艺', '#0ea5e9',
    'SOP 工艺问答、质检记录与异常上报。',
    [
      { type: 'industry', key: 'mfg', label: '传统制造' },
      { type: 'scenario', key: 's09-sop', label: '质检SOP' },
      { type: 'module', key: 'quality_inspect', label: '质检SOP' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 质检SOP · 批次工序录入', '>> 合格/不合格 · 当场判定', '>> 企微钉钉飞书 · 异常推送', '>> CapShip · 双端真接口']),
  scene('s10', '库存盘点', '零售 · 仓储', '#f97316',
    '库存查询、盘点任务与补货提醒。',
    [
      { type: 'industry', key: 'retail', label: '零售电商' },
      { type: 'scenario', key: 's10-stock', label: '库存盘点' },
      { type: 'module', key: 'inventory_count', label: '库存盘点' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 库存盘点 · 货位SKU扫录', '>> 实盘数量 · 待主管确认', '>> 企微钉钉飞书 · 差异通知', '>> CapShip · 双端真接口']),
  scene('s11', '会员营销', '零售 · 运营', '#fb923c',
    '会员积分、促销活动与消息推送。',
    [
      { type: 'industry', key: 'retail', label: '零售电商' },
      { type: 'office', key: '消息通知', label: '消息通知' },
      { type: 'scenario', key: 's11-member', label: '会员管理' },
      { type: 'module', key: 'member_loyalty', label: '会员营销' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 会员营销 · 积分活动登记', '>> 券码/积分 · 待触达确认', '>> 企微钉钉飞书 · 活动推送', '>> CapShip · 双端真接口']),
  scene('s12', '医疗导诊', '医院 · 患者', '#10b981',
    '就医指南、排班查询与导诊问答。',
    [
      { type: 'industry', key: 'med', label: '医疗健康' },
      { type: 'scenario', key: 's12-guide', label: '就医指南' },
      { type: 'module', key: 'med_triage', label: '医疗导诊' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 医疗导诊 · 症状预问诊', '>> 推荐科室 · 就诊指引', '>> 企微钉钉飞书 · 提醒推送', '>> CapShip · 双端真接口']),
  scene('s13', '护士排班', '医院 · 排班', '#059669',
    '护士排班、调班申请与值班通知。',
    [
      { type: 'industry', key: 'med', label: '医疗健康' },
      { type: 'scenario', key: 's13-shift', label: '排班/调班申请' },
      { type: 'module', key: 'nurse_shift', label: '护士排班' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 护士排班 · 调班在线申请', '>> 护士长 · 通过/驳回', '>> 企微钉钉飞书 · 值班通知', '>> CapShip · 双端真接口']),
  scene('s14', '玩家FAQ', '游戏 · 客服', '#a855f7',
    '玩家攻略 FAQ、活动规则与客服工单。',
    [
      { type: 'industry', key: 'game', label: '游戏娱乐' },
      { type: 'scenario', key: 's14-faq', label: '玩家FAQ/攻略' },
      { type: 'scenario', key: 's14-ticket', label: '客服工单' },
      { type: 'module', key: 'game_support', label: '玩家FAQ' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 玩家FAQ · 攻略入库', '>> 客服工单 · 问题跟踪', '>> 企微钉钉飞书 · 活动规则推送', '>> CapShip · 双端真接口']),
  scene('s15', '家校通知', '教育 · 家长', '#22c55e',
    '学校通知、活动报名与家长留言。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's15-notice', label: '家校通知' },
      { type: 'module', key: 'school_notice', label: '家校通知' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 家校通知 · 活动公告推送', '>> 报名留言 · 在线互动', '>> 企微钉钉飞书 · 家长触达', '>> CapShip · 双端真接口']),
  scene('s16', '作业答疑', '教育 · 学生', '#3b82f6',
    '写清页码题号与卡点，>> Soft 步进提问，老师批改闭环。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's16-hw', label: '作业提交' },
      { type: 'scenario', key: 's16-qa', label: '课程答疑' },
      { type: 'module', key: 'homework_qa', label: '作业答疑' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 作业答疑 · 页码题号卡点', '>> Soft 步进 · 提交真库', '>> 企微钉钉飞书 · 批改通知', '>> CapShip · 双端真接口']),
  scene('s17', '课表查询', '校园 · 日程', '#2563eb',
    '课程/考试登记：日期点选 + 时段推进，教室可空，归档真库。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's17-schedule', label: '课表查询' },
      { type: 'module', key: 'class_schedule', label: '课表查询' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 课表 · 课程考试登记', '>> 日期时段 · Soft 步进', '>> 企微钉钉飞书 · 日程提醒', '>> CapShip · 双端真接口']),
  scene('s18', '活动运营', '市场 · 活动', '#06b6d4',
    '活动策划、报名统计与转化复盘。',
    [
      { type: 'industry', key: 'marketing', label: '市场营销' },
      { type: 'scenario', key: 's18-main', label: '活动运营' },
      { type: 'module', key: 'campaign_ops', label: '活动运营' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 活动运营 · 排期素材登记', '>> 报名复盘 · 指标闭环', '>> 企微钉钉飞书 · 触达推送', '>> CapShip · 双端真接口'], '运营'),

  scene('s19', '物业报修', '生活 · 社区', '#78716c',
    '业主报修、工单处理与进度查询。',
    [
      { type: 'industry', key: 'realestate', label: '房地产' },
      { type: 'scenario', key: 's19-fix', label: '物业报修' },
      { type: 'module', key: 'property_repair', label: '物业报修' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 物业报修 · 业主扫码提单', '>> 派工维修 · 进度跟踪', '>> 企微钉钉飞书 · 状态推送', '>> CapShip · 双端真接口'], 4),
  scene('s20', '看房签约', '房产 · 销售', '#b45309',
    '看房预约、意向登记与签约跟进。',
    [
      { type: 'industry', key: 'realestate', label: '房地产' },
      { type: 'scenario', key: 's20-main', label: '看房签约' },
      { type: 'module', key: 'house_viewing', label: '看房签约' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 看房签约 · 客户房源登记', '>> 意向/签约 · 跟进闭环', '>> 企微钉钉飞书 · 进度推送', '>> CapShip · 双端真接口'], '销售'),

  scene('s21', '酒店预订', '餐饮 · 预订', '#ec4899',
    '客房预订、排班管理与客诉处理。',
    [
      { type: 'industry', key: 'hotel', label: '酒店餐饮' },
      { type: 'scenario', key: 's21-book', label: '客房预订' },
      { type: 'module', key: 'hotel_booking', label: '酒店预订' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 酒店预订 · 房型入住登记', '>> 入住/取消 · 房态闭环', '>> 企微钉钉飞书 · 确认推送', '>> CapShip · 双端真接口']),
  scene('s22', '外卖配送', '生活 · 配送', '#f43f5e',
    '订单跟踪、骑手调度与异常处理。',
    [
      { type: 'industry', key: 'logistics', label: '物流仓储' },
      { type: 'scenario', key: 's22-main', label: '外卖配送' },
      { type: 'module', key: 'delivery_order', label: '外卖配送' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 外卖配送 · 取送信息登记', '>> 配送中/完成 · 状态闭环', '>> 企微钉钉飞书 · 异常推送', '>> CapShip · 双端真接口'], '骑手'),

  scene('s23', '健身打卡', '生活 · 健康', '#14b8a6',
    '课程预约、训练打卡与教练答疑。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's23-main', label: '健身打卡' },
      { type: 'module', key: 'fitness_checkin', label: '健身打卡' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 健身打卡 · 课程预约登记', '>> 训练打卡 · 完成闭环', '>> 企微钉钉飞书 · 提醒推送', '>> CapShip · 双端真接口'], '会员'),

  scene('s24', '旅行攻略', '生活 · 出行', '#0d9488',
    '行程规划、景点问答与预订提醒。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's24-main', label: '旅行攻略' },
      { type: 'module', key: 'travel_plan', label: '旅行攻略' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 旅行攻略 · 目的地行程登记', '>> 景点/预订 · 确认闭环', '>> 企微钉钉飞书 · 提醒推送', '>> CapShip · 双端真接口'], '旅行'),

  scene('s25', '婚礼筹备', '生活 · 庆典', '#e879f9',
    '宾客名单、供应商协同与预算跟踪。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's25-main', label: '婚礼筹备' },
      { type: 'module', key: 'wedding_plan', label: '婚礼筹备' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 婚礼筹备 · 宾客供应商登记', '>> 预算确认 · 进度闭环', '>> 企微钉钉飞书 · 协同提醒', '>> CapShip · 双端真接口'], '新人'),

  scene('s26', '装修选材', '生活 · 家装', '#ca8a04',
    '材料选型、进度验收与预算审批。',
    [
      { type: 'industry', key: 'construction', label: '建筑工程' },
      { type: 'scenario', key: 's26-main', label: '装修选材' },
      { type: 'module', key: 'deco_material', label: '装修选材' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 装修选材 · 材料部位登记', '>> 进度验收 · 闭环完成', '>> 企微钉钉飞书 · 验收提醒', '>> CapShip · 双端真接口'], '业主'),

  scene('s27', '宠物问诊', '生活 · 宠物', '#f472b6',
    '宠物健康问答、预约就诊与疫苗提醒。',
    [
      { type: 'industry', key: 'med', label: '医疗健康' },
      { type: 'scenario', key: 's27-main', label: '宠物问诊' },
      { type: 'module', key: 'pet_clinic', label: '宠物问诊' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 宠物问诊 · 症状登记', '>> 就诊/疫苗 · 预约闭环', '>> 企微钉钉飞书 · 提醒推送', '>> CapShip · 双端真接口'], '宠主'),

  scene('s28', '巡检打卡', '能源 · 安全', '#eab308',
    '设备巡检、隐患上报与安全合规。',
    [
      { type: 'industry', key: 'energy', label: '能源电力' },
      { type: 'scenario', key: 's28-inspect', label: '巡检管理' },
      { type: 'module', key: 'site_patrol', label: '巡检打卡' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 巡检打卡 · 站点点位录入', '>> 合格/隐患 · 当场闭环', '>> 企微钉钉飞书 · 合规推送', '>> CapShip · 双端真接口']),
  scene('s29', '政务办事', '政务 · 便民', '#475569',
    '办事指南、诉求提交与进度查询。',
    [
      { type: 'industry', key: 'gov', label: '政务公用' },
      { type: 'scenario', key: 's29-main', label: '政务办事' },
      { type: 'module', key: 'gov_service', label: '政务办事' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 政务办事 · 事项诉求登记', '>> 办理进度 · 办结闭环', '>> 企微钉钉飞书 · 进度推送', '>> CapShip · 双端真接口'], '市民'),

  scene('s30', '法务合同', '法务 · 合规', '#334155',
    '合同审查、法规检索与案件跟踪。',
    [
      { type: 'industry', key: 'legal', label: '法律服务' },
      { type: 'scenario', key: 's30-main', label: '法务合同' },
      { type: 'module', key: 'legal_case', label: '法务合同' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 法务合同 · 审查案件登记', '>> 节点跟进 · 闭环完成', '>> 企微钉钉飞书 · 节点提醒', '>> CapShip · 双端真接口'], '法务'),

  scene('s31', '上海话语音助手', '方言 · 语音', '#db2777',
    '上海话实时语音交互：开口即问、语音播报、支持方言识别。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'module', key: 'shanghai_voice', label: '上海话语音' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 上海话语音 · 开口即问', '>> 实时语音 · 边说边答', '>> 语音播报 · 听得到', '>> 手机/网页 · 直接可用'], '全员'),
  scene('s32', '课本学习', '教育 · 学生', '#6366f1',
    '说书名定位册次 → 生成大纲 → Soft 步进记家默/复习/考试，进度真库。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's32-study', label: '课本学习' },
      { type: 'module', key: 'study_coach', label: '课本学习' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 课本 · 书名定位册次', '>> 大纲 · Module/Unit 规划', '>> 家默复习考试 · Soft 步进', '>> CapShip · 双端真接口'], 5),
  scene('s33', '家默督导', '教育 · 家长', '#8b5cf6',
    '家长代记听写默写：选单元、写错词得分，与课本学习同一真库闭环。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's33-dictation', label: '家默督导' },
      { type: 'module', key: 'study_coach', label: '课本学习' },
      { type: 'module', key: 'school_notice', label: '家校通知' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 家默 · 听写错词得分', '>> 选单元 · Soft 步进', '>> 企微钉钉飞书 · 提醒推送', '>> CapShip · 双端真接口'], 4),
  scene('s34', '教学规划', '教育 · 老师', '#4f46e5',
    '按课本生成教学单元，跟学生进度、测验与作业答疑闭环。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's34-teach', label: '教学规划' },
      { type: 'module', key: 'study_coach', label: '课本学习' },
      { type: 'module', key: 'homework_qa', label: '作业答疑' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 教学规划 · 课本大纲', '>> 测验家默 · 掌握度跟进', '>> 作业答疑 · Soft 批改', '>> CapShip · 双端真接口'], 4),
  scene('s35', '银行KYC', '银行 · 开户', '#0369a1',
    '对公/零售开户身份核验，真 KYC 工单入库。',
    [
      { type: 'industry', key: 'bank', label: '商业银行' },
      { type: 'scenario', key: 's35-kyc', label: '对公开户 KYC' },
      { type: 'module', key: 'finance_kyc', label: '金融KYC' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 金融KYC · 客户核验', '>> Soft 步进 · 提交真库', '>> 企微钉钉飞书 · 开户提醒', '>> CapShip · 双端真接口']),
  scene('s36', '反洗钱监测', '银行 · 合规', '#b91c1c',
    '可疑交易识别与风控预警，真 AML 工单。',
    [
      { type: 'industry', key: 'bank', label: '商业银行' },
      { type: 'scenario', key: 's36-aml', label: '反洗钱监测' },
      { type: 'module', key: 'finance_aml', label: '反洗钱监测' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 反洗钱 · 预警登记', '>> Soft 步进 · 研判归档', '>> 企微钉钉飞书 · 合规推送', '>> CapShip · 双端真接口']),
  scene('s37', '授信审批', '银行 · 信贷', '#1d4ed8',
    '授信额度/担保审批与贷后检查。',
    [
      { type: 'industry', key: 'bank', label: '商业银行' },
      { type: 'scenario', key: 's37-credit', label: '授信审批' },
      { type: 'module', key: 'credit_approval', label: '授信审批' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 授信审批 · 额度担保', '>> Soft 步进 · 真库闭环', '>> 企微钉钉飞书 · 审批通知', '>> CapShip · 双端真接口']),
  scene('s38', '核保理赔', '保险 · 承保', '#0284c7',
    '核保评估与理赔报案，真保险工单。',
    [
      { type: 'industry', key: 'insurance', label: '保险' },
      { type: 'scenario', key: 's38-case', label: '核保理赔' },
      { type: 'module', key: 'insurance_case', label: '保险核保理赔' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 核保理赔 · 保单客户', '>> Soft 步进 · 办结真库', '>> 企微钉钉飞书 · 案件通知', '>> CapShip · 双端真接口']),
  scene('s39', '监管报送', '资管 · 合规', '#4338ca',
    '监管报表报送任务登记与办结。',
    [
      { type: 'industry', key: 'fund', label: '基金资管' },
      { type: 'scenario', key: 's39-report', label: '监管报送' },
      { type: 'module', key: 'regulatory_report', label: '监管报送' },
      { type: 'module', key: 'notify_im', label: '企微钉钉飞书' },
    ],
    ['>> 监管报送 · 报表周期', '>> Soft 步进 · 标记已报', '>> 企微钉钉飞书 · 截止提醒', '>> CapShip · 双端真接口']),
]

export interface DanmakuLayout {
  preset: RolePreset
  track: number
  delay: number
  duration: number
  direction: 'normal' | 'reverse'
  /** 起始水平位置 %，组成 >> 形分布 */
  startLeft: number
}

const LANE_COUNT = 10

/** >> 形双 chevron：每组 5 轨斜向错开，避免右侧整齐一条线 */
function chevronStartLeft(track: number, direction: 'normal' | 'reverse'): number {
  const laneInChevron = track % 5
  const chevron = Math.floor(track / 5) % 2
  const step = 7.2
  if (direction === 'normal') {
    const base = chevron === 0 ? 97 : 56
    return Math.max(14, base - laneInChevron * step)
  }
  const base = chevron === 0 ? 3 : 44
  return Math.min(86, base + laneInChevron * step)
}

/** 10 轨道 >> 形分配，同轨错峰 */
export function buildDanmakuLayout(presets: RolePreset[] = []): DanmakuLayout[] {
  const lanes: RolePreset[][] = Array.from({ length: LANE_COUNT }, () => [])
  presets.forEach((preset, i) => {
    lanes[i % LANE_COUNT].push(preset)
  })

  const layouts: DanmakuLayout[] = []
  lanes.forEach((laneItems, track) => {
    const duration = 32 + (track % 5) * 5
    const count = laneItems.length
    const direction: 'normal' | 'reverse' = track % 4 === 2 ? 'reverse' : 'normal'
    const startLeft = chevronStartLeft(track, direction)
    const laneInChevron = track % 5
    const chevron = Math.floor(track / 5) % 2
    laneItems.forEach((preset, slot) => {
      const spacing = duration / count
      layouts.push({
        preset,
        track,
        delay: -(slot * spacing) - laneInChevron * 1.35 - chevron * 2.2,
        duration,
        direction,
        startLeft,
      })
    })
  })
  return layouts
}

export interface RoleApplyRequest {
  preset: RolePreset
  generate?: boolean
}

export function getRolePreset(id: string): RolePreset | undefined {
  return ROLE_PRESETS.find((r) => r.id === id)
}

export function mapHeroPresetFromApi(item: {
  id: string
  label: string
  hint: string
  role?: string
  weight: number
  color: string
  prompt: string
  picks: AgentPick[]
  flowLines: string[]
}): RolePreset {
  // 内置 CapShip 场景以本地 picks 为准，避免 DB/缓存仍指向旧审批流导致「弹幕 ≠ >>」
  const local = ROLE_PRESETS.find((p) => p.id === item.id)
  const flowLines = local?.flowLines
    ?? (Array.isArray(item.flowLines) && item.flowLines.length > 0
      ? item.flowLines
      : [`>> ${item.label} · 一键生成`, '>> 智能编排 · 场景就绪'])
  return {
    id: item.id,
    label: item.label || local?.label || item.id,
    hint: item.hint || local?.hint || '',
    role: item.role || local?.role,
    weight: item.weight || local?.weight || 3,
    color: item.color || local?.color || '#6366f1',
    prompt: local?.prompt || item.prompt,
    picks: (local?.picks?.length ? local.picks : item.picks) ?? [],
    flowLines,
  }
}
