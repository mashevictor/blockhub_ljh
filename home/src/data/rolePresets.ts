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
      { type: 'office', key: '人事行政', label: '人事行政' },
      { type: 'scenario', key: 's01-leave', label: '请假申请' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 请假申请 · 手机一键提交', '>> 审批流 · 主管即时批复', '>> 假期余额 · 自动扣减', '>> 消息提醒 · 结果推送']),
  scene('s02', '报销记账', '财务 · 票据', '#0284c7',
    '费用报销拍照上传、财务审核与台账查询。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'office', key: '财务法务', label: '财务法务' },
      { type: 'scenario', key: 's02-exp', label: '报销申请' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 报销申请 · 发票拍照上传', '>> 财务审核 · 合规自动校验', '>> 审批流 · 多级签批', '>> 台账查询 · 费用明细']),
  scene('s03', '制度问答', '知识 · 自助', '#6366f1',
    '公司制度、福利政策智能问答，随时自助查询。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'office', key: '知识协同', label: '知识协同' },
      { type: 'scenario', key: 's03-kb', label: '制度政策问答' },
      { type: 'module', key: 'kb_document', label: '知识库' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 制度政策问答 · 不懂就问', '>> 知识库 · 手册文档检索', '>> 智能问答 · 结合上下文', '>> 多端门户 · 随时可查']),
  scene('s04', '招聘入职', 'HR · 人才', '#a855f7',
    '招聘发布、简历筛选与入职指引一站式。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'office', key: '人事行政', label: '人事行政' },
      { type: 'scenario', key: 's04-hire', label: '招聘管理' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 招聘管理 · 岗位发布', '>> 简历筛选 · 内推跟踪', '>> 入职指引 · 材料清单', '>> 审批流 · offer 签发']),
  scene('s05', '销售线索', 'CRM · 跟进', '#ef4444',
    '线索录入、客户跟进与销售漏斗管理。',
    [
      { type: 'industry', key: 'sales', label: '销售行业' },
      { type: 'scenario', key: 's05-crm', label: '客户跟进' },
      { type: 'module', key: 'chart_funnel', label: '销售漏斗' },
    ],
    ['>> 客户跟进 · 线索分配', '>> 销售漏斗 · 阶段转化', '>> 话术助手 · 场景推荐', '>> 待办提醒 · 回访计划']),
  scene('s06', '报价合同', '销售 · 签单', '#dc2626',
    '报价审批、合同评审与特价申请。',
    [
      { type: 'industry', key: 'sales', label: '销售行业' },
      { type: 'scenario', key: 's06-quote', label: '报价审批' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 报价审批 · 特价快速过审', '>> 合同评审 · 条款核对', '>> 审批流 · 多级授权', '>> 消息通知 · 结果同步']),
  scene('s07', '经营看板', '老板 · 决策', '#f59e0b',
    '核心经营指标一屏掌控，自然语言查数。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'office', key: '数据报表', label: '数据报表' },
      { type: 'scenario', key: 's07-dash', label: '经营看板' },
      { type: 'module', key: 'chart_dashboard', label: '数据看板' },
    ],
    ['>> 经营看板 · 核心指标一屏', '>> 数据报表 · 自然语言查数', '>> 高管审批 · 重大事项快批', '>> 待办汇总 · 跨部门协同']),
  scene('s08', '设备报修', '制造 · 运维', '#3b82f6',
    '现场设备故障报修、工单派发与维修跟踪。',
    [
      { type: 'industry', key: 'mfg', label: '传统制造' },
      { type: 'scenario', key: 's08-repair', label: '设备报修' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 设备报修 · 扫码提单', '>> 工单派发 · 自动派工', '>> 维修跟踪 · 进度可视', '>> 消息通知 · 完工提醒']),
  scene('s09', '质检SOP', '制造 · 工艺', '#0ea5e9',
    'SOP 工艺问答、质检记录与异常上报。',
    [
      { type: 'industry', key: 'mfg', label: '传统制造' },
      { type: 'scenario', key: 's09-sop', label: 'SOP/工艺问答' },
      { type: 'module', key: 'kb_document', label: '知识库' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> SOP/工艺问答 · 现场即时查', '>> 知识库 · 工艺文档', '>> 质检记录 · 移动端录入', '>> 异常上报 · 快速流转']),
  scene('s10', '库存盘点', '零售 · 仓储', '#f97316',
    '库存查询、盘点任务与补货提醒。',
    [
      { type: 'industry', key: 'retail', label: '零售电商' },
      { type: 'scenario', key: 's10-stock', label: '库存管理' },
      { type: 'module', key: 'chart_dashboard', label: '数据看板' },
    ],
    ['>> 库存管理 · 实时库存查', '>> 盘点任务 · 移动端扫码', '>> 补货提醒 · 低库存预警', '>> 数据看板 · 周转分析']),
  scene('s11', '会员营销', '零售 · 运营', '#fb923c',
    '会员积分、促销活动与消息推送。',
    [
      { type: 'industry', key: 'retail', label: '零售电商' },
      { type: 'office', key: '消息通知', label: '消息通知' },
      { type: 'scenario', key: 's11-member', label: '会员管理' },
      { type: 'module', key: 'notify_inapp', label: '站内信' },
    ],
    ['>> 会员管理 · 积分等级', '>> 促销活动 · 券码发放', '>> 消息推送 · 精准触达', '>> 站内信 · 活动公告']),
  scene('s12', '医疗导诊', '医院 · 患者', '#10b981',
    '就医指南、排班查询与导诊问答。',
    [
      { type: 'industry', key: 'med', label: '医疗健康' },
      { type: 'scenario', key: 's12-guide', label: '就医指南' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 就医指南 · 科室导航', '>> 排班查询 · 医生出诊', '>> 智能问答 · 症状初筛', '>> 预约提醒 · 就诊通知']),
  scene('s13', '护士排班', '医院 · 排班', '#059669',
    '护士排班、调班申请与值班通知。',
    [
      { type: 'industry', key: 'med', label: '医疗健康' },
      { type: 'scenario', key: 's13-shift', label: '排班/调班申请' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 排班/调班申请 · 在线提交', '>> 审批流 · 护士长批复', '>> 值班通知 · 自动推送', '>> 日历视图 · 一目了然']),
  scene('s14', '玩家FAQ', '游戏 · 客服', '#a855f7',
    '玩家攻略 FAQ、活动规则与客服工单。',
    [
      { type: 'industry', key: 'game', label: '游戏娱乐' },
      { type: 'scenario', key: 's14-faq', label: '玩家FAQ/攻略' },
      { type: 'scenario', key: 's14-ticket', label: '客服工单' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 玩家FAQ/攻略 · 即时解答', '>> 客服工单 · 问题跟踪', '>> 活动规则 · 自动推送', '>> 智能问答 · 7×24 在线']),
  scene('s15', '家校通知', '教育 · 家长', '#22c55e',
    '学校通知、活动报名与家长留言。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's15-notice', label: '家校通知' },
      { type: 'module', key: 'notify_inapp', label: '站内信' },
    ],
    ['>> 家校通知 · 活动公告推送', '>> 活动报名 · 在线登记', '>> 家长留言 · 家校互动', '>> 站内信 · 已读回执']),
  scene('s16', '作业答疑', '教育 · 学生', '#3b82f6',
    '课程答疑、作业提交与错题巩固。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's16-hw', label: '作业提交' },
      { type: 'scenario', key: 's16-qa', label: '课程答疑' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 课程答疑 · 知识点即时问', '>> 作业提交 · 在线交作业', '>> 错题巩固 · 智能推荐', '>> 知识库 · 课件检索']),
  scene('s17', '课表查询', '校园 · 日程', '#2563eb',
    '课程表、考试安排与教室查询。',
    [
      { type: 'industry', key: 'edu', label: '教育培训' },
      { type: 'scenario', key: 's17-schedule', label: '课表查询' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 课表查询 · 今日课程', '>> 考试安排 · 倒计时提醒', '>> 教室查询 · 空教室', '>> 智能问答 · 校园制度']),
  scene('s18', '活动运营', '市场 · 活动', '#06b6d4',
    '活动策划、报名统计与转化复盘。',
    [
      { type: 'industry', key: 'marketing', label: '市场营销' },
      { type: 'office', key: '数据报表', label: '数据报表' },
      { type: 'scenario', key: 's18-campaign', label: '活动管理' },
      { type: 'module', key: 'notify_inapp', label: '站内信' },
    ],
    ['>> 活动管理 · 排期素材', '>> 报名统计 · 实时看板', '>> 转化复盘 · 漏斗分析', '>> 消息推送 · 多渠道触达']),
  scene('s19', '物业报修', '生活 · 社区', '#78716c',
    '业主报修、工单处理与进度查询。',
    [
      { type: 'industry', key: 'realestate', label: '房地产' },
      { type: 'scenario', key: 's19-fix', label: '物业报修' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 物业报修 · 拍照提单', '>> 工单处理 · 师傅派单', '>> 进度查询 · 实时跟踪', '>> 评价反馈 · 服务闭环'], 4),
  scene('s20', '看房签约', '房产 · 销售', '#b45309',
    '看房预约、意向登记与签约跟进。',
    [
      { type: 'industry', key: 'realestate', label: '房地产' },
      { type: 'scenario', key: 's20-view', label: '看房预约' },
      { type: 'module', key: 'chart_funnel', label: '销售漏斗' },
    ],
    ['>> 看房预约 · 在线选房', '>> 意向登记 · 客户画像', '>> 销售漏斗 · 跟进阶段', '>> 签约提醒 · 节点推送']),
  scene('s21', '酒店预订', '餐饮 · 预订', '#ec4899',
    '客房预订、排班管理与客诉处理。',
    [
      { type: 'industry', key: 'hotel', label: '酒店餐饮' },
      { type: 'scenario', key: 's21-book', label: '客房预订' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 客房预订 · 房态查询', '>> 排班管理 · 人员轮班', '>> 客诉处理 · 工单跟踪', '>> 消息通知 · 入住提醒']),
  scene('s22', '外卖配送', '生活 · 配送', '#f43f5e',
    '订单跟踪、骑手调度与异常处理。',
    [
      { type: 'industry', key: 'logistics', label: '物流仓储' },
      { type: 'scenario', key: 's22-deliver', label: '运单跟踪' },
      { type: 'module', key: 'notify_inapp', label: '站内信' },
    ],
    ['>> 运单跟踪 · 实时位置', '>> 骑手调度 · 智能派单', '>> 异常处理 · 快速响应', '>> 消息推送 · 送达通知']),
  scene('s23', '健身打卡', '生活 · 健康', '#14b8a6',
    '课程预约、训练打卡与教练答疑。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's23-gym', label: '课程预约' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 课程预约 · 团课私教', '>> 训练打卡 · 记录成长', '>> 教练答疑 · 动作指导', '>> 数据看板 · 体脂趋势']),
  scene('s24', '旅行攻略', '生活 · 出行', '#0d9488',
    '行程规划、景点问答与预订提醒。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's24-trip', label: '行程规划' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 行程规划 · 路线推荐', '>> 景点问答 · 攻略检索', '>> 预订提醒 · 节点推送', '>> 智能问答 · 当地资讯']),
  scene('s25', '婚礼筹备', '生活 · 庆典', '#e879f9',
    '宾客名单、供应商协同与预算跟踪。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'scenario', key: 's25-wedding', label: '活动筹备' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 宾客名单 · 席位安排', '>> 供应商协同 · 进度跟踪', '>> 预算跟踪 · 费用管控', '>> 消息通知 · 日程提醒']),
  scene('s26', '装修选材', '生活 · 家装', '#ca8a04',
    '材料选型、进度验收与预算审批。',
    [
      { type: 'industry', key: 'construction', label: '建筑工程' },
      { type: 'scenario', key: 's26-deco', label: '材料管理' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 材料管理 · 选型比价', '>> 进度验收 · 节点拍照', '>> 预算审批 · 超支预警', '>> 工单流转 · 施工方协同']),
  scene('s27', '宠物问诊', '生活 · 宠物', '#f472b6',
    '宠物健康问答、预约就诊与疫苗提醒。',
    [
      { type: 'industry', key: 'med', label: '医疗健康' },
      { type: 'scenario', key: 's27-pet', label: '在线问诊' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 在线问诊 · 症状描述', '>> 预约就诊 · 时段选择', '>> 疫苗提醒 · 定期推送', '>> 健康档案 · 成长记录']),
  scene('s28', '巡检打卡', '能源 · 安全', '#eab308',
    '设备巡检、隐患上报与安全合规。',
    [
      { type: 'industry', key: 'energy', label: '能源电力' },
      { type: 'scenario', key: 's28-inspect', label: '巡检管理' },
      { type: 'module', key: 'approval_flow', label: '审批流' },
    ],
    ['>> 巡检管理 · 路线打卡', '>> 隐患上报 · 拍照留痕', '>> 安全合规 · 制度问答', '>> 工单闭环 · 整改跟踪']),
  scene('s29', '政务办事', '政务 · 便民', '#475569',
    '办事指南、诉求提交与进度查询。',
    [
      { type: 'industry', key: 'gov', label: '政务公用' },
      { type: 'scenario', key: 's29-gov', label: '办事指南' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 办事指南 · 材料清单', '>> 诉求提交 · 在线受理', '>> 进度查询 · 节点透明', '>> 智能问答 · 政策解读']),
  scene('s30', '法务合同', '法务 · 合规', '#334155',
    '合同审查、法规检索与案件跟踪。',
    [
      { type: 'industry', key: 'legal', label: '法律服务' },
      { type: 'office', key: '财务法务', label: '财务法务' },
      { type: 'scenario', key: 's30-legal', label: '合同管理' },
      { type: 'module', key: 'kb_document', label: '知识库' },
    ],
    ['>> 合同管理 · 版本比对', '>> 法规检索 · 条款查询', '>> 案件跟踪 · 节点提醒', '>> 知识库 · 判例沉淀'], 4),
  scene('s31', '上海话语音助手', '方言 · 语音', '#db2777',
    '上海话实时语音交互：开口即问、语音播报、支持方言识别。',
    [
      { type: 'industry', key: 'office', label: '通用办公' },
      { type: 'module', key: 'shanghai_voice', label: '上海话语音' },
      { type: 'module', key: 'chat_qa', label: '智能问答' },
    ],
    ['>> 上海话语音 · 开口即问', '>> 实时语音 · 边说边答', '>> 语音播报 · 听得到', '>> 手机/网页 · 直接可用'], '全员'),
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
  const flowLines = Array.isArray(item.flowLines) && item.flowLines.length > 0
    ? item.flowLines
    : [`>> ${item.label} · 一键生成`, '>> 智能编排 · 场景就绪']
  return {
    id: item.id,
    label: item.label,
    hint: item.hint,
    role: item.role,
    weight: item.weight,
    color: item.color,
    prompt: item.prompt,
    picks: item.picks ?? [],
    flowLines,
  }
}
