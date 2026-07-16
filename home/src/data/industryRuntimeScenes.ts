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

export function getIndustryRuntimePreview(packKey: string): IndustryRuntimePackPreview | null {
  if (packKey === 'mfg') return MFG_RUNTIME_PREVIEW
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
