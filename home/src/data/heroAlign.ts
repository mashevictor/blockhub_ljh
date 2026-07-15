/**
 * 弹幕预设 ↔ >> 匹配对齐：自由输入命中弹幕场景时，强制使用同一套 picks。
 */
import type { AgentPick } from '../components/agentInputLogic'
import { ROLE_PRESETS, type RolePreset } from './rolePresets'

const ALIASES: Record<string, string[]> = {
  s01: ['请假审批', '请假申请', '假期余额', '请假'],
  s02: ['报销记账', '费用报销', '发票上传', '报销申请'],
  s03: ['制度问答', '制度政策', '福利政策', '制度查询'],
  s04: ['招聘入职', '招聘管理', '简历筛选', '入职指引'],
  s05: ['销售线索', '客户跟进', '线索录入', '销售漏斗'],
  s06: ['报价合同', '报价审批', '合同评审', '特价申请'],
  s07: ['经营看板', '经营指标', '自然语言查数', '老板看板'],
  s08: ['设备报修', '报修', '维修工单', '扫码提单', '产线故障'],
  s09: ['质检SOP', '质检', 'SOP', '终检', '不合格'],
  s10: ['库存盘点', '盘点', '货位', 'SKU', '补货'],
  s11: ['会员营销', '会员积分', '会员管理', '促销活动', '券码', '积分兑换'],
  s12: ['医疗导诊', '智能导诊', '就医指南', '导诊', '科室导航', '预问诊', '症状初筛'],
  s13: ['护士排班', '调班申请', '护士调班', '值班通知', '排班调班'],
  s14: ['玩家FAQ', '玩家攻略', '客服工单', '活动规则', '游戏FAQ'],
  s15: ['家校通知', '活动报名', '家长留言', '学校通知', '家校'],
  s16: ['作业答疑', '作业提交', '课程答疑', '错题巩固', '错题'],
  s17: ['课表查询', '课程表', '考试安排', '教室查询', '课表'],
  s19: ['物业报修', '业主报修', '小区报修', '物业工单'],
  s21: ['酒店预订', '客房预订', '入住登记', '酒店客房'],
  s22: ['外卖配送', '外卖', '骑手调度', '配送异常', '订单跟踪', '运单跟踪'],
  s20: ['看房签约', '看房预约', '意向登记', '签约跟进', '带看'],
  s18: ['活动运营', '活动策划', '报名统计', '转化复盘', '活动管理'],
  s23: ['健身打卡', '课程预约', '训练打卡', '教练答疑', '健身'],
  s24: ['旅行攻略', '行程规划', '景点问答', '预订提醒', '旅行'],
  s25: ['婚礼筹备', '宾客名单', '供应商协同', '婚礼预算', '婚庆'],
  s26: ['装修选材', '材料选型', '进度验收', '家装预算', '装修'],
  s27: ['宠物问诊', '宠物健康', '预约就诊', '疫苗提醒', '宠物'],
  s29: ['政务办事', '办事指南', '诉求提交', '进度查询', '政务'],
  s30: ['法务合同', '合同审查', '法规检索', '案件跟踪', '法务'],
  s28: ['巡检打卡', '设备巡检', '隐患上报', '安全巡检', '巡检管理'],
  s32: ['课本学习', '学习规划', '学习进度', '家默', '听写', '复习跟进'],
  s33: ['家默督导', '家默', '听写', '默写', '家长督导'],
  s34: ['教学规划', '老师备课', '教学大纲', '学情跟进'],
  s00: ['上海话', '沪语'],
  s31: ['上海话', '沪语', '方言语音'],
}

/** 选型即交付 / CapShip 主能力，命中后不应被二次 suggest 冲掉 */
export const CAPSHIP_MODULE_KEYS = new Set([
  'device_repair',
  'quality_inspect',
  'inventory_count',
  'member_loyalty',
  'med_triage',
  'nurse_shift',
  'game_support',
  'school_notice',
  'homework_qa',
  'property_repair',
  'site_patrol',
  'class_schedule',
  'hotel_booking',
  'study_coach',
  'travel_plan',
  'legal_case',
  'ops_kpi',
  'quote_contract',
  'sales_lead',
  'hire_onboard',
  'policy_qa',
  'expense_claim',
  'leave_request',
  'gov_service',
  'pet_clinic',
  'deco_material',
  'wedding_plan',
  'fitness_checkin',
  'campaign_ops',
  'house_viewing',
  'delivery_order',
  'shanghai_voice',
])

function scorePreset(text: string, preset: RolePreset): number {
  const t = text.trim()
  if (t.length < 2) return 0
  let score = 0
  if (preset.label && (t.includes(preset.label) || preset.label.includes(t))) score += 9.5
  for (const a of ALIASES[preset.id] ?? []) {
    if (t.includes(a)) score += a.length >= 3 ? 4.5 : 3.2
  }
  for (const pick of preset.picks) {
    if (pick.label && t.includes(pick.label)) {
      score += pick.type === 'module' || pick.type === 'capability' ? 3.5 : 2
    }
  }
  for (const line of preset.flowLines) {
    const frag = line.replace(/>>/g, '').trim().split('·')[0]?.trim() ?? ''
    if (frag.length >= 2 && t.includes(frag)) score += 2.2
  }
  return score
}

export function matchHeroPreset(text: string): RolePreset | null {
  let best: RolePreset | null = null
  let bestScore = 0
  for (const p of ROLE_PRESETS) {
    const s = scorePreset(text, p)
    if (s > bestScore) {
      bestScore = s
      best = p
    }
  }
  return bestScore >= 5 ? best : null
}

/** 弹幕 / >> 共用的能力选型（去掉纯动作） */
export function picksForCapabilityAlign(preset: RolePreset): AgentPick[] {
  return preset.picks.filter(
    (p) => p.type === 'industry' || p.type === 'office' || p.type === 'module' || p.type === 'capability' || p.type === 'scenario',
  )
}

/**
 * >> 命中弹幕场景时：强制与弹幕点击同一套 picks。
 * 禁止再混入 API / DeepSeek 的审批流等无关主能力。
 */
export function alignSuggestPicksWithHero(text: string, _apiPicks: AgentPick[]): AgentPick[] {
  const hero = matchHeroPreset(text)
  if (!hero) return _apiPicks
  return picksForCapabilityAlign(hero)
}

export function userHasCapShipModule(modules: { type: string; key: string; source?: string }[]): boolean {
  return modules.some(
    (m) =>
      (m.type === 'module' || m.type === 'capability') &&
      CAPSHIP_MODULE_KEYS.has(m.key) &&
      (m.source === 'user' || m.source === 'suggest'),
  )
}
