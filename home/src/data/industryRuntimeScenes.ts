/** 行业 Runtime 场景页预览数据（与行业方案站清单一一对应） */

export type ScenePageKind =
  | 'repair'
  | 'chat_kb'
  | 'oee'
  | 'quality'
  | 'material'
  | 'safety'
  | 'roster'
  | 'maintain'
  | 'bom'
  | 'integration'
  | 'energy'
  | 'training'
  | 'understood'

export interface ScenePageMock {
  form_title?: string
  fields?: Array<{ label: string; value?: string }>
  list_title?: string
  list?: Array<{ id: string; title: string; status: string }>
  chat_title?: string
  chat?: Array<{ role: string; text: string }>
  files_title?: string
  files?: string[]
  kpis?: Array<{ label: string; value: string; hint?: string }>
  primary_action?: string
}

export interface IndustryRuntimeScene {
  id: string
  name: string
  category: string
  summary: string
  pages: string
  standard: '✓' | '部分' | '定制'
  kind: ScenePageKind
  capabilityHint: string
  /** 大模型理解后的页面样例（用户新增场景） */
  pageMock?: ScenePageMock
}

export interface IndustryRuntimePackPreview {
  key: string
  name: string
  tagline: string
  accent: string
  scenes: IndustryRuntimeScene[]
}

export const MFG_RUNTIME_PREVIEW: IndustryRuntimePackPreview = {
  key: 'mfg',
  name: '传统制造',
  tagline: '报修、SOP、质检、MES 打通 · 12 场景工作台',
  accent: '#2563eb',
  scenes: [
    {
      id: 's1',
      name: '设备报修',
      category: '设备管理',
      summary: '产线故障报修派工',
      pages: 'form+list',
      standard: '✓',
      kind: 'repair',
      capabilityHint: 'device_repair',
    },
    {
      id: 's2',
      name: 'SOP/工艺问答',
      category: '知识管理',
      summary: '作业指导书检索',
      pages: 'chat+kb',
      standard: '✓',
      kind: 'chat_kb',
      capabilityHint: 'chat_qa + kb_document',
    },
    {
      id: 's3',
      name: '生产日报/OEE',
      category: '生产管理',
      summary: '车间产量稼动率',
      pages: 'chart',
      standard: '✓',
      kind: 'oee',
      capabilityHint: 'mfg_oee',
    },
    {
      id: 's4',
      name: '质检审批',
      category: '质量管理',
      summary: '来料成品质检',
      pages: 'approval',
      standard: '✓',
      kind: 'quality',
      capabilityHint: 'quality_inspect',
    },
    {
      id: 's5',
      name: '物料领用',
      category: '物料管理',
      summary: '生产领退料',
      pages: 'approval',
      standard: '✓',
      kind: 'material',
      capabilityHint: 'material_issue',
    },
    {
      id: 's6',
      name: '安环隐患上报',
      category: '安全管理',
      summary: '安全隐患拍照上报',
      pages: 'form+approval',
      standard: '✓',
      kind: 'safety',
      capabilityHint: 'site_patrol',
    },
    {
      id: 's7',
      name: '排班/考勤',
      category: '人事管理',
      summary: '班次查询申诉',
      pages: 'list+approval',
      standard: '✓',
      kind: 'roster',
      capabilityHint: 'shift_attendance',
    },
    {
      id: 's8',
      name: '保养计划提醒',
      category: '设备管理',
      summary: '设备保养到期',
      pages: 'notify',
      standard: '✓',
      kind: 'maintain',
      capabilityHint: 'maintenance_plan',
    },
    {
      id: 's9',
      name: '图纸/BOM检索',
      category: '知识管理',
      summary: '工程文档问答',
      pages: 'kb',
      standard: '✓',
      kind: 'bom',
      capabilityHint: 'kb_document',
    },
    {
      id: 's10',
      name: '对接MES/ERP',
      category: '系统集成',
      summary: '制造系统打通',
      pages: 'integration',
      standard: '✓',
      kind: 'integration',
      capabilityHint: 'erp_connector',
    },
    {
      id: 's11',
      name: '能耗/碳排统计',
      category: '绿色制造',
      summary: '绿色制造指标',
      pages: 'chart',
      standard: '✓',
      kind: 'energy',
      capabilityHint: 'energy_carbon',
    },
    {
      id: 's12',
      name: '技能培训记录',
      category: '人事管理',
      summary: '上岗证培训档案',
      pages: 'list+kb',
      standard: '✓',
      kind: 'training',
      capabilityHint: 'training_record',
    },
  ],
}

export const OFFICE_RUNTIME_PREVIEW: IndustryRuntimePackPreview = {
  key: 'office',
  name: '通用办公',
  tagline: '请假报销·会议室·资产·IT · 真 Runtime',
  accent: '#6366f1',
  scenes: [
    { id: 'o1', name: '制度政策问答', category: '知识协同', summary: '制度政策福利智能问答', pages: 'chat+kb', standard: '✓', kind: 'chat_kb', capabilityHint: 'policy_qa' },
    { id: 'o2', name: '请假申请', category: '人事行政', summary: '员工请假在线申请', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'leave_request' },
    { id: 'o3', name: '加班申请', category: '人事行政', summary: '加班时段申请审批', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'leave_request' },
    { id: 'o4', name: '出差申请', category: '人事行政', summary: '出差行程申请', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'leave_request' },
    { id: 'o5', name: '报销审批', category: '财务法务', summary: '费用报销与发票', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'expense_claim' },
    { id: 'o6', name: '借款申请', category: '财务法务', summary: '员工借款审批', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'expense_claim' },
    { id: 'o7', name: '付款申请', category: '财务法务', summary: '对外付款审批', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'expense_claim' },
    { id: 'o8', name: '入职办理', category: '人事行政', summary: '招聘入职看板', pages: 'form+list', standard: '✓', kind: 'understood', capabilityHint: 'hire_onboard' },
    { id: 'o9', name: '用印申请', category: '人事行政', summary: '印章与文件用途审批', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'seal_request' },
    { id: 'o10', name: '会议室预约', category: '人事行政', summary: '会议室时段预约真表', pages: 'form+list', standard: '✓', kind: 'understood', capabilityHint: 'meeting_booking' },
    { id: 'o11', name: '通用审批', category: '流程审批', summary: '自定义事项审批', pages: 'approval', standard: '✓', kind: 'understood', capabilityHint: 'approval_flow' },
    { id: 'o12', name: '待办中心', category: '流程审批', summary: '跨流程待办', pages: 'list', standard: '✓', kind: 'understood', capabilityHint: 'approval_inbox' },
    { id: 'o13', name: '部门看板', category: '数据报表', summary: '部门经营看板', pages: 'chart', standard: '✓', kind: 'oee', capabilityHint: 'ops_kpi' },
    { id: 'o14', name: '考勤查询', category: '人事行政', summary: '班次考勤查询', pages: 'list', standard: '✓', kind: 'roster', capabilityHint: 'shift_attendance' },
    { id: 'o15', name: '制度文档库', category: '知识协同', summary: '制度文档检索', pages: 'kb', standard: '✓', kind: 'bom', capabilityHint: 'kb_document' },
    { id: 'o16', name: 'IT报障', category: 'IT与资产', summary: 'IT 工单真表', pages: 'form+list', standard: '✓', kind: 'repair', capabilityHint: 'it_ticket' },
    { id: 'o17', name: '资产领用', category: 'IT与资产', summary: '资产领用盘点真表', pages: 'form+list', standard: '✓', kind: 'understood', capabilityHint: 'asset_manage' },
    { id: 'o18', name: '企微通知', category: '消息通知', summary: '企微钉钉飞书通道', pages: 'integration', standard: '✓', kind: 'integration', capabilityHint: 'notify_im' },
  ],
}

export function getIndustryRuntimePreview(packKey: string): IndustryRuntimePackPreview | null {
  if (packKey === 'mfg') return MFG_RUNTIME_PREVIEW
  if (packKey === 'office') return OFFICE_RUNTIME_PREVIEW
  return null
}

export function groupScenesByCategory(scenes: IndustryRuntimeScene[]) {
  const map = new Map<string, IndustryRuntimeScene[]>()
  for (const s of scenes) {
    const list = map.get(s.category) ?? []
    list.push(s)
    map.set(s.category, list)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
}
